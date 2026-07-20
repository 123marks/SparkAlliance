package main

import (
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

const maxUploadSize = 5 << 20 // 5MB

var allowedExts = map[string]bool{
	".png": true, ".jpg": true, ".jpeg": true, ".webp": true,
	".gif": true, ".mp4": true, ".webm": true,
}

// POST /api/uploads（multipart，field=file，≤5MB，扩展名白名单）
func (a *app) handleUpload(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize+4096)
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		writeError(w, http.StatusBadRequest, "FILE_TOO_LARGE", "文件不能超过 5MB")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "NO_FILE", "缺少 file 字段")
		return
	}
	defer file.Close()

	if header.Size > maxUploadSize {
		writeError(w, http.StatusBadRequest, "FILE_TOO_LARGE", "文件不能超过 5MB")
		return
	}
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if !allowedExts[ext] {
		writeError(w, http.StatusBadRequest, "BAD_FILE_TYPE",
			"只支持 png/jpg/jpeg/webp/gif/mp4/webm")
		return
	}

	if err := os.MkdirAll(a.cfg.UploadDir, 0o755); err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL", "创建上传目录失败")
		return
	}
	name := uuidv4() + ext
	dst, err := os.Create(filepath.Join(a.cfg.UploadDir, name))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL", "写入文件失败")
		return
	}
	defer dst.Close()
	if _, err := io.Copy(dst, file); err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL", "写入文件失败")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"url": "/uploads/" + name})
}

// GET /uploads/{name}（静态文件；只允许白名单扩展名的单层文件名，防目录穿越）
func (a *app) handleServeUpload(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")
	if name == "" || strings.ContainsAny(name, `/\`) ||
		strings.Contains(name, "..") || !allowedExts[strings.ToLower(filepath.Ext(name))] {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "文件不存在")
		return
	}
	path := filepath.Join(a.cfg.UploadDir, name)
	if _, err := os.Stat(path); err != nil {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "文件不存在")
		return
	}
	http.ServeFile(w, r, path)
}
