package main

import (
	"context"
	"crypto"
	"crypto/hmac"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"
)

// payProvider 支付网关抽象（契约 §4.3e）。
type payProvider interface {
	// createPayment 为 pending 订单生成支付信息（pay_url / qr_code 等）
	createPayment(ctx context.Context, o orderDTO) (map[string]any, error)
}

var errProviderUnconfigured = errors.New("provider unconfigured")

// ---- sandbox：本地模拟，完整走签名回调 + 幂等 ----

type sandboxProvider struct{ secret string }

func (s sandboxProvider) sign(orderID string) string {
	mac := hmac.New(sha256.New, []byte(s.secret))
	mac.Write([]byte(orderID))
	return hex.EncodeToString(mac.Sum(nil))
}

func (s sandboxProvider) createPayment(_ context.Context, o orderDTO) (map[string]any, error) {
	return map[string]any{
		"provider": "sandbox",
		"pay_url":  "/api/pay/sandbox/" + o.ID,
		// dev 模拟"支付页"应携带的确认签名，confirm 时回传
		"sandbox_sign": s.sign(o.ID),
	}, nil
}

// ---- alipay：当面付 precreate 签名请求 + notify RSA2 验签 ----

type alipayProvider struct {
	appID     string
	gateway   string
	notifyURL string
	priv      *rsa.PrivateKey
	pub       *rsa.PublicKey
}

// newAlipayProvider 未配置 env 时返回 errProviderUnconfigured（代码路径完整，密钥即插即用）。
func (a *app) newAlipayProvider() (alipayProvider, error) {
	if !a.cfg.alipayConfigured() {
		return alipayProvider{}, errProviderUnconfigured
	}
	priv, err := parseRSAPrivateKey(a.cfg.AlipayPrivateKey)
	if err != nil {
		return alipayProvider{}, fmt.Errorf("解析 ALIPAY_PRIVATE_KEY 失败: %w", err)
	}
	pub, err := parseRSAPublicKey(a.cfg.AlipayPublicKey)
	if err != nil {
		return alipayProvider{}, fmt.Errorf("解析 ALIPAY_PUBLIC_KEY 失败: %w", err)
	}
	return alipayProvider{
		appID:     a.cfg.AlipayAppID,
		gateway:   a.cfg.AlipayGateway,
		notifyURL: a.cfg.AlipayNotifyURL,
		priv:      priv,
		pub:       pub,
	}, nil
}

// parseRSAPrivateKey 支持 PEM（PKCS1/PKCS8）或裸 base64（支付宝开放平台工具格式）。
func parseRSAPrivateKey(s string) (*rsa.PrivateKey, error) {
	der := decodePEMOrBase64(s)
	if der == nil {
		return nil, errors.New("既不是 PEM 也不是合法 base64")
	}
	if k, err := x509.ParsePKCS8PrivateKey(der); err == nil {
		if rk, ok := k.(*rsa.PrivateKey); ok {
			return rk, nil
		}
		return nil, errors.New("PKCS8 内不是 RSA 私钥")
	}
	return x509.ParsePKCS1PrivateKey(der)
}

func parseRSAPublicKey(s string) (*rsa.PublicKey, error) {
	der := decodePEMOrBase64(s)
	if der == nil {
		return nil, errors.New("既不是 PEM 也不是合法 base64")
	}
	if k, err := x509.ParsePKIXPublicKey(der); err == nil {
		if rk, ok := k.(*rsa.PublicKey); ok {
			return rk, nil
		}
		return nil, errors.New("PKIX 内不是 RSA 公钥")
	}
	return x509.ParsePKCS1PublicKey(der)
}

func decodePEMOrBase64(s string) []byte {
	s = strings.TrimSpace(s)
	if block, _ := pem.Decode([]byte(s)); block != nil {
		return block.Bytes
	}
	if raw, err := base64.StdEncoding.DecodeString(strings.ReplaceAll(s, "\n", "")); err == nil {
		return raw
	}
	return nil
}

// alipaySignParams 按支付宝规范：key 升序拼 k=v&k=v（跳过 sign/空值），SHA256WithRSA。
func alipaySignParams(params map[string]string, priv *rsa.PrivateKey) (string, error) {
	digest := sha256.Sum256([]byte(alipayCanonical(params)))
	sig, err := rsa.SignPKCS1v15(nil, priv, crypto.SHA256, digest[:])
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(sig), nil
}

func alipayVerifyParams(params map[string]string, signB64 string, pub *rsa.PublicKey) error {
	sig, err := base64.StdEncoding.DecodeString(signB64)
	if err != nil {
		return fmt.Errorf("sign 不是合法 base64: %w", err)
	}
	digest := sha256.Sum256([]byte(alipayCanonical(params)))
	return rsa.VerifyPKCS1v15(pub, crypto.SHA256, digest[:], sig)
}

func alipayCanonical(params map[string]string) string {
	keys := make([]string, 0, len(params))
	for k, v := range params {
		if k == "sign" || k == "sign_type" || v == "" {
			continue
		}
		keys = append(keys, k)
	}
	sort.Strings(keys)
	pairs := make([]string, 0, len(keys))
	for _, k := range keys {
		pairs = append(pairs, k+"="+params[k])
	}
	return strings.Join(pairs, "&")
}

// createPayment 生成 alipay.trade.precreate 签名请求并调网关换二维码内容。
func (p alipayProvider) createPayment(ctx context.Context, o orderDTO) (map[string]any, error) {
	bizContent, _ := json.Marshal(map[string]string{
		"out_trade_no": o.ID,
		"total_amount": fmt.Sprintf("%d.%02d", o.AmountCents/100, o.AmountCents%100),
		"subject":      "Spark Alliance 校园二手交易",
	})
	params := map[string]string{
		"app_id":      p.appID,
		"method":      "alipay.trade.precreate",
		"charset":     "utf-8",
		"sign_type":   "RSA2",
		"timestamp":   time.Now().In(time.FixedZone("CST", 8*3600)).Format("2006-01-02 15:04:05"),
		"version":     "1.0",
		"biz_content": string(bizContent),
	}
	if p.notifyURL != "" {
		params["notify_url"] = p.notifyURL
	}
	sign, err := alipaySignParams(params, p.priv)
	if err != nil {
		return nil, fmt.Errorf("RSA2 签名失败: %w", err)
	}
	params["sign"] = sign

	form := url.Values{}
	for k, v := range params {
		form.Set(k, v)
	}
	reqCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(reqCtx, http.MethodPost, p.gateway,
		strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded;charset=utf-8")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("请求支付宝网关失败: %w", err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))

	var gw struct {
		Resp struct {
			Code    string `json:"code"`
			Msg     string `json:"msg"`
			SubMsg  string `json:"sub_msg"`
			QRCode  string `json:"qr_code"`
			TradeNo string `json:"out_trade_no"`
		} `json:"alipay_trade_precreate_response"`
	}
	if err := json.Unmarshal(raw, &gw); err != nil {
		return nil, fmt.Errorf("网关响应解析失败: %w", err)
	}
	if gw.Resp.Code != "10000" {
		return nil, fmt.Errorf("支付宝返回 %s: %s %s", gw.Resp.Code, gw.Resp.Msg, gw.Resp.SubMsg)
	}
	return map[string]any{"provider": "alipay", "qr_code": gw.Resp.QRCode}, nil
}

// ---- 订单支付入口与回调 ----

// POST /api/shop/orders/{id}/pay {provider}
func (a *app) handlePayOrder(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(w, r, "id")
	if !ok {
		return
	}
	var in struct {
		Provider string `json:"provider"`
	}
	if !decodeJSON(w, r, &in) {
		return
	}

	o, err := scanOrder(a.pool.QueryRow(r.Context(),
		`SELECT `+orderCols+` FROM orders WHERE id = $1 AND buyer_id = $2`, id, userID(r)))
	if err != nil {
		writeDBError(w, err)
		return
	}
	if o.Status != "pending" {
		writeError(w, http.StatusConflict, "ORDER_NOT_PAYABLE", "订单当前状态不可支付")
		return
	}

	var provider payProvider
	switch in.Provider {
	case "sandbox":
		provider = sandboxProvider{secret: a.cfg.SandboxPaySecret}
	case "alipay":
		p, err := a.newAlipayProvider()
		if errors.Is(err, errProviderUnconfigured) {
			writeError(w, http.StatusServiceUnavailable, "PROVIDER_UNCONFIGURED",
				"支付宝支付未配置（缺少 ALIPAY_* 环境变量）")
			return
		}
		if err != nil {
			writeError(w, http.StatusInternalServerError, "INTERNAL", err.Error())
			return
		}
		provider = p
	default:
		writeError(w, http.StatusBadRequest, "BAD_PROVIDER", "provider 只能是 sandbox 或 alipay")
		return
	}

	payInfo, err := provider.createPayment(r.Context(), o)
	if err != nil {
		writeError(w, http.StatusBadGateway, "PAY_CREATE_FAILED", "创建支付失败："+err.Error())
		return
	}
	if _, err := a.pool.Exec(r.Context(),
		`UPDATE orders SET provider = $2 WHERE id = $1`, id, in.Provider); err != nil {
		writeDBError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, payInfo)
}

// markOrderPaid 幂等置 paid：只有 pending→paid 一次生效，同事务置 item=sold + 流水。
func (a *app) markOrderPaid(ctx context.Context, orderID, provider, txnID string, payload []byte) (changed bool, err error) {
	tx, err := a.pool.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var itemID string
	err = tx.QueryRow(ctx,
		`UPDATE orders SET status = 'paid', paid_at = now(), provider = $2, provider_txn_id = $3
		 WHERE id = $1 AND status = 'pending'
		 RETURNING item_id`, orderID, provider, txnID).Scan(&itemID)
	if isNoRows(err) {
		return false, nil // 已处理过（幂等）或不可支付
	}
	if err != nil {
		return false, err
	}
	if _, err := tx.Exec(ctx,
		`UPDATE shop_items SET status = 'sold', updated_at = now() WHERE id = $1`, itemID); err != nil {
		return false, err
	}
	if len(payload) == 0 || !json.Valid(payload) {
		payload = []byte("{}")
	}
	if _, err := tx.Exec(ctx,
		`INSERT INTO payment_events (order_id, type, payload) VALUES ($1, $2, $3)`,
		orderID, provider+".paid", payload); err != nil {
		return false, err
	}
	return true, tx.Commit(ctx)
}

// POST /api/pay/sandbox/{order_id}/confirm {sign}（HMAC-SHA256 验签 + 幂等）
func (a *app) handleSandboxConfirm(w http.ResponseWriter, r *http.Request) {
	orderID := r.PathValue("order_id")
	if !isValidUUID(orderID) {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "订单不存在")
		return
	}
	var in struct {
		Sign string `json:"sign"`
	}
	if !decodeJSON(w, r, &in) {
		return
	}
	sp := sandboxProvider{secret: a.cfg.SandboxPaySecret}
	expected := sp.sign(orderID)
	if !hmac.Equal([]byte(strings.ToLower(in.Sign)), []byte(expected)) {
		writeError(w, http.StatusUnauthorized, "BAD_SIGN", "签名校验失败")
		return
	}

	var status string
	if err := a.pool.QueryRow(r.Context(),
		`SELECT status FROM orders WHERE id = $1`, orderID).Scan(&status); err != nil {
		writeDBError(w, err)
		return
	}
	if status == "cancelled" || status == "refunded" {
		writeError(w, http.StatusConflict, "ORDER_NOT_PAYABLE", "订单已取消或已退款")
		return
	}

	payload, _ := json.Marshal(map[string]string{"sign": in.Sign, "source": "sandbox_confirm"})
	changed, err := a.markOrderPaid(r.Context(), orderID, "sandbox",
		"sandbox_"+randomHex(8), payload)
	if err != nil {
		writeDBError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"order_id": orderID, "status": "paid", "changed": changed,
	})
}

// POST /api/pay/alipay/notify（支付宝异步通知：RSA2 验签；未配置 503）
func (a *app) handleAlipayNotify(w http.ResponseWriter, r *http.Request) {
	p, err := a.newAlipayProvider()
	if errors.Is(err, errProviderUnconfigured) {
		writeError(w, http.StatusServiceUnavailable, "PROVIDER_UNCONFIGURED",
			"支付宝支付未配置（缺少 ALIPAY_* 环境变量）")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL", err.Error())
		return
	}
	if err := r.ParseForm(); err != nil {
		writeError(w, http.StatusBadRequest, "BAD_FORM", "通知参数解析失败")
		return
	}
	params := map[string]string{}
	for k := range r.PostForm {
		params[k] = r.PostForm.Get(k)
	}
	if err := alipayVerifyParams(params, params["sign"], p.pub); err != nil {
		writeError(w, http.StatusUnauthorized, "BAD_SIGN", "RSA2 验签失败")
		return
	}

	orderID := params["out_trade_no"]
	tradeStatus := params["trade_status"]
	if !isValidUUID(orderID) {
		writeError(w, http.StatusBadRequest, "BAD_ORDER", "out_trade_no 不合法")
		return
	}
	if tradeStatus == "TRADE_SUCCESS" || tradeStatus == "TRADE_FINISHED" {
		payload, _ := json.Marshal(params)
		if _, err := a.markOrderPaid(r.Context(), orderID, "alipay",
			params["trade_no"], payload); err != nil {
			writeDBError(w, err)
			return
		}
	}
	// 支付宝要求回 "success" 纯文本停止重发
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("success"))
}
