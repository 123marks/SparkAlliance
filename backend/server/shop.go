package main

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
)

// ---- 商品 shop_items ----

type shopItemDTO struct {
	ID          string   `json:"id"`
	SellerID    string   `json:"seller_id"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	PriceCents  int      `json:"price_cents"`
	Images      []string `json:"images"`
	Category    string   `json:"category"`
	Status      string   `json:"status"`
	CreatedAt   string   `json:"created_at"`
	UpdatedAt   string   `json:"updated_at"`
}

const shopItemCols = `id, seller_id, title, description, price_cents, images,
	category, status, created_at, updated_at`

func scanShopItem(row rowScanner) (shopItemDTO, error) {
	var it shopItemDTO
	var created, updated time.Time
	err := row.Scan(&it.ID, &it.SellerID, &it.Title, &it.Description,
		&it.PriceCents, &it.Images, &it.Category, &it.Status, &created, &updated)
	if err != nil {
		return it, err
	}
	it.Images = orEmptyStrs(it.Images)
	it.CreatedAt = fmtTime(created)
	it.UpdatedAt = fmtTime(updated)
	return it, nil
}

// GET /api/shop/items?search=&category=&limit=&offset=（公开，在售）
// mine=1（需登录）：只看自己发布的商品，且不限 on_sale（含已售出/下架）
func (a *app) handleListShopItems(w http.ResponseWriter, r *http.Request) {
	limit, offset := parsePagination(r)
	search := trimToNil(r.URL.Query().Get("search"))
	category := trimToNil(r.URL.Query().Get("category"))

	var mineID *string
	if r.URL.Query().Get("mine") == "1" {
		uid := userID(r)
		if uid == "" {
			writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "请先登录")
			return
		}
		mineID = &uid
	}

	var total int
	if err := a.pool.QueryRow(r.Context(),
		`SELECT count(*) FROM shop_items
		 WHERE ($3::uuid IS NULL AND status = 'on_sale' OR seller_id = $3)
		   AND ($1::text IS NULL OR title ILIKE '%' || $1 || '%' OR description ILIKE '%' || $1 || '%')
		   AND ($2::text IS NULL OR category = $2)`,
		search, category, mineID).Scan(&total); err != nil {
		writeDBError(w, err)
		return
	}

	rows, err := a.pool.Query(r.Context(),
		`SELECT `+shopItemCols+` FROM shop_items
		 WHERE ($3::uuid IS NULL AND status = 'on_sale' OR seller_id = $3)
		   AND ($1::text IS NULL OR title ILIKE '%' || $1 || '%' OR description ILIKE '%' || $1 || '%')
		   AND ($2::text IS NULL OR category = $2)
		 ORDER BY created_at DESC
		 LIMIT $4 OFFSET $5`,
		search, category, mineID, limit, offset)
	if err != nil {
		writeDBError(w, err)
		return
	}
	defer rows.Close()
	items := []shopItemDTO{}
	for rows.Next() {
		it, err := scanShopItem(rows)
		if err != nil {
			writeDBError(w, err)
			return
		}
		items = append(items, it)
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "total": total})
}

// POST /api/shop/items
func (a *app) handleCreateShopItem(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Title       string   `json:"title"`
		Description string   `json:"description"`
		PriceCents  int      `json:"price_cents"`
		Images      []string `json:"images"`
		Category    string   `json:"category"`
	}
	if !decodeJSON(w, r, &in) {
		return
	}
	in.Title = strings.TrimSpace(in.Title)
	if in.Title == "" {
		writeError(w, http.StatusBadRequest, "EMPTY_TITLE", "标题不能为空")
		return
	}
	if in.PriceCents <= 0 || in.PriceCents > 100_000_000 {
		writeError(w, http.StatusBadRequest, "BAD_PRICE", "价格需为正整数分且不超过 100 万元")
		return
	}

	it, err := scanShopItem(a.pool.QueryRow(r.Context(),
		`INSERT INTO shop_items (seller_id, title, description, price_cents, images, category)
		 VALUES ($1, $2, $3, $4, $5, $6) RETURNING `+shopItemCols,
		userID(r), in.Title, in.Description, in.PriceCents,
		orEmptyStrs(in.Images), strings.TrimSpace(in.Category)))
	if err != nil {
		writeDBError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, it)
}

// PATCH /api/shop/items/{id}（卖家或 admin；改价/下架/重新上架）
func (a *app) handleUpdateShopItem(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(w, r, "id")
	if !ok {
		return
	}
	var sellerID, curStatus string
	if err := a.pool.QueryRow(r.Context(),
		`SELECT seller_id, status FROM shop_items WHERE id = $1`, id).
		Scan(&sellerID, &curStatus); err != nil {
		writeDBError(w, err)
		return
	}
	if sellerID != userID(r) && !isAdmin(r) {
		writeError(w, http.StatusForbidden, "FORBIDDEN", "只能修改自己发布的商品")
		return
	}

	var in struct {
		Title       *string   `json:"title"`
		Description *string   `json:"description"`
		PriceCents  *int      `json:"price_cents"`
		Images      *[]string `json:"images"`
		Category    *string   `json:"category"`
		Status      *string   `json:"status"`
	}
	if !decodeJSON(w, r, &in) {
		return
	}
	var b updateBuilder
	if in.Title != nil {
		if strings.TrimSpace(*in.Title) == "" {
			writeError(w, http.StatusBadRequest, "EMPTY_TITLE", "标题不能为空")
			return
		}
		b.add("title", strings.TrimSpace(*in.Title))
	}
	if in.Description != nil {
		b.add("description", *in.Description)
	}
	if in.PriceCents != nil {
		if *in.PriceCents <= 0 || *in.PriceCents > 100_000_000 {
			writeError(w, http.StatusBadRequest, "BAD_PRICE", "价格需为正整数分且不超过 100 万元")
			return
		}
		b.add("price_cents", *in.PriceCents)
	}
	if in.Images != nil {
		b.add("images", orEmptyStrs(*in.Images))
	}
	if in.Category != nil {
		b.add("category", strings.TrimSpace(*in.Category))
	}
	if in.Status != nil {
		// sold 只能由支付流程流转
		if *in.Status != "on_sale" && *in.Status != "off_shelf" {
			writeError(w, http.StatusBadRequest, "BAD_STATUS", "status 只能是 on_sale 或 off_shelf")
			return
		}
		if curStatus == "sold" {
			writeError(w, http.StatusConflict, "ITEM_SOLD", "已售出商品不能改状态")
			return
		}
		b.add("status", *in.Status)
	}
	if b.empty() {
		writeError(w, http.StatusBadRequest, "EMPTY_PATCH", "没有可更新的字段")
		return
	}
	b.addExpr("updated_at = now()")

	args := append(b.args, id)
	it, err := scanShopItem(a.pool.QueryRow(r.Context(),
		`UPDATE shop_items SET `+strings.Join(b.sets, ", ")+
			` WHERE id = $`+itoa(len(b.args)+1)+` RETURNING `+shopItemCols, args...))
	if err != nil {
		writeDBError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, it)
}

// ---- 订单 orders ----

type orderDTO struct {
	ID            string  `json:"id"`
	BuyerID       string  `json:"buyer_id"`
	SellerID      string  `json:"seller_id"`
	ItemID        string  `json:"item_id"`
	ItemTitle     string  `json:"item_title,omitempty"`
	AmountCents   int     `json:"amount_cents"`
	Status        string  `json:"status"`
	Provider      string  `json:"provider"`
	ProviderTxnID string  `json:"provider_txn_id"`
	CreatedAt     string  `json:"created_at"`
	PaidAt        *string `json:"paid_at"`
}

const orderCols = `id, buyer_id, seller_id, item_id, amount_cents, status,
	provider, provider_txn_id, created_at, paid_at`

func scanOrder(row rowScanner) (orderDTO, error) {
	var o orderDTO
	var created time.Time
	var paidAt *time.Time
	err := row.Scan(&o.ID, &o.BuyerID, &o.SellerID, &o.ItemID, &o.AmountCents,
		&o.Status, &o.Provider, &o.ProviderTxnID, &created, &paidAt)
	if err != nil {
		return o, err
	}
	o.CreatedAt = fmtTime(created)
	o.PaidAt = fmtTimePtr(paidAt)
	return o, nil
}

// POST /api/shop/orders {item_id, idempotency_key}
func (a *app) handleCreateOrder(w http.ResponseWriter, r *http.Request) {
	var in struct {
		ItemID         string `json:"item_id"`
		IdempotencyKey string `json:"idempotency_key"`
	}
	if !decodeJSON(w, r, &in) {
		return
	}
	in.IdempotencyKey = strings.TrimSpace(in.IdempotencyKey)
	if !isValidUUID(in.ItemID) {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "商品不存在")
		return
	}
	if in.IdempotencyKey == "" || len(in.IdempotencyKey) > 128 {
		writeError(w, http.StatusBadRequest, "VALIDATION", "idempotency_key 必填（≤128 字符）")
		return
	}

	// 同 key 重放：直接返回已有订单（幂等）
	if o, err := scanOrder(a.pool.QueryRow(r.Context(),
		`SELECT `+orderCols+` FROM orders WHERE idempotency_key = $1`, in.IdempotencyKey)); err == nil {
		if o.BuyerID != userID(r) {
			writeError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "idempotency_key 已被占用")
			return
		}
		writeJSON(w, http.StatusOK, o)
		return
	} else if !isNoRows(err) {
		writeDBError(w, err)
		return
	}

	var sellerID, itemStatus string
	var priceCents int
	if err := a.pool.QueryRow(r.Context(),
		`SELECT seller_id, status, price_cents FROM shop_items WHERE id = $1`, in.ItemID).
		Scan(&sellerID, &itemStatus, &priceCents); err != nil {
		writeDBError(w, err)
		return
	}
	if itemStatus != "on_sale" {
		writeError(w, http.StatusConflict, "ITEM_NOT_ON_SALE", "商品不在售")
		return
	}
	if sellerID == userID(r) {
		writeError(w, http.StatusBadRequest, "SELF_PURCHASE", "不能购买自己发布的商品")
		return
	}
	// 同一买家同一商品存在未支付订单时不允许重复下单
	var hasPending bool
	if err := a.pool.QueryRow(r.Context(),
		`SELECT EXISTS(SELECT 1 FROM orders
		 WHERE buyer_id = $1 AND item_id = $2 AND status = 'pending')`,
		userID(r), in.ItemID).Scan(&hasPending); err != nil {
		writeDBError(w, err)
		return
	}
	if hasPending {
		writeError(w, http.StatusConflict, "DUPLICATE_ORDER", "该商品已有未支付订单")
		return
	}

	o, err := scanOrder(a.pool.QueryRow(r.Context(),
		`INSERT INTO orders (buyer_id, seller_id, item_id, amount_cents, idempotency_key)
		 VALUES ($1, $2, $3, $4, $5) RETURNING `+orderCols,
		userID(r), sellerID, in.ItemID, priceCents, in.IdempotencyKey))
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			writeError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "idempotency_key 已被占用")
			return
		}
		writeDBError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, o)
}

// GET /api/shop/orders?role=buyer|seller
func (a *app) handleListOrders(w http.ResponseWriter, r *http.Request) {
	limit, offset := parsePagination(r)
	role := r.URL.Query().Get("role")
	col := "buyer_id"
	if role == "seller" {
		col = "seller_id"
	}
	// col 为二选一常量，无注入面
	rows, err := a.pool.Query(r.Context(),
		`SELECT o.id, o.buyer_id, o.seller_id, o.item_id, o.amount_cents, o.status,
		        o.provider, o.provider_txn_id, o.created_at, o.paid_at, i.title
		 FROM orders o JOIN shop_items i ON i.id = o.item_id
		 WHERE o.`+col+` = $1
		 ORDER BY o.created_at DESC
		 LIMIT $2 OFFSET $3`,
		userID(r), limit, offset)
	if err != nil {
		writeDBError(w, err)
		return
	}
	defer rows.Close()
	orders := []orderDTO{}
	for rows.Next() {
		var o orderDTO
		var created time.Time
		var paidAt *time.Time
		if err := rows.Scan(&o.ID, &o.BuyerID, &o.SellerID, &o.ItemID, &o.AmountCents,
			&o.Status, &o.Provider, &o.ProviderTxnID, &created, &paidAt, &o.ItemTitle); err != nil {
			writeDBError(w, err)
			return
		}
		o.CreatedAt = fmtTime(created)
		o.PaidAt = fmtTimePtr(paidAt)
		orders = append(orders, o)
	}
	writeJSON(w, http.StatusOK, map[string]any{"orders": orders})
}

// POST /api/shop/orders/{id}/cancel（买家取消 pending 订单）
func (a *app) handleCancelOrder(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(w, r, "id")
	if !ok {
		return
	}
	tag, err := a.pool.Exec(r.Context(),
		`UPDATE orders SET status = 'cancelled'
		 WHERE id = $1 AND buyer_id = $2 AND status = 'pending'`, id, userID(r))
	if err != nil {
		writeDBError(w, err)
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusConflict, "ORDER_NOT_CANCELLABLE", "订单不存在或不可取消")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"id": id, "status": "cancelled"})
}

// GET /api/admin/orders?status=（订单管理 + 金额汇总）
func (a *app) handleAdminListOrders(w http.ResponseWriter, r *http.Request) {
	limit, offset := parsePagination(r)
	status := trimToNil(r.URL.Query().Get("status"))

	var total, totalAmount, paidAmount int
	if err := a.pool.QueryRow(r.Context(),
		`SELECT count(*), coalesce(sum(amount_cents), 0),
		        coalesce(sum(amount_cents) FILTER (WHERE status = 'paid'), 0)
		 FROM orders WHERE ($1::text IS NULL OR status = $1)`,
		status).Scan(&total, &totalAmount, &paidAmount); err != nil {
		writeDBError(w, err)
		return
	}

	rows, err := a.pool.Query(r.Context(),
		`SELECT o.id, o.buyer_id, o.seller_id, o.item_id, o.amount_cents, o.status,
		        o.provider, o.provider_txn_id, o.created_at, o.paid_at, i.title,
		        bu.email, su.email
		 FROM orders o
		 JOIN shop_items i ON i.id = o.item_id
		 JOIN users bu ON bu.id = o.buyer_id
		 JOIN users su ON su.id = o.seller_id
		 WHERE ($1::text IS NULL OR o.status = $1)
		 ORDER BY o.created_at DESC
		 LIMIT $2 OFFSET $3`,
		status, limit, offset)
	if err != nil {
		writeDBError(w, err)
		return
	}
	defer rows.Close()

	type adminOrder struct {
		orderDTO
		BuyerEmail  string `json:"buyer_email"`
		SellerEmail string `json:"seller_email"`
	}
	orders := []adminOrder{}
	for rows.Next() {
		var o adminOrder
		var created time.Time
		var paidAt *time.Time
		if err := rows.Scan(&o.ID, &o.BuyerID, &o.SellerID, &o.ItemID, &o.AmountCents,
			&o.Status, &o.Provider, &o.ProviderTxnID, &created, &paidAt,
			&o.ItemTitle, &o.BuyerEmail, &o.SellerEmail); err != nil {
			writeDBError(w, err)
			return
		}
		o.CreatedAt = fmtTime(created)
		o.PaidAt = fmtTimePtr(paidAt)
		orders = append(orders, o)
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"orders": orders, "total": total,
		"total_amount_cents": totalAmount, "paid_amount_cents": paidAmount,
	})
}
