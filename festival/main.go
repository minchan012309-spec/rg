package main

import (
	"embed"
	"errors"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

//go:embed web
var assets embed.FS

func browser() (string, error) {
	switch runtime.GOOS {
	case "windows":
		for _, name := range []string{"Microsoft/Edge/Application/msedge.exe", "Google/Chrome/Application/chrome.exe"} {
			for _, root := range []string{"ProgramFiles(x86)", "ProgramFiles", "LOCALAPPDATA"} {
				if base := os.Getenv(root); base != "" {
					path := filepath.Join(base, filepath.FromSlash(name))
					if _, err := os.Stat(path); err == nil {
						return path, nil
					}
				}
			}
		}
	case "darwin":
		for _, path := range []string{
			"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
			"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
		} {
			if _, err := os.Stat(path); err == nil {
				return path, nil
			}
		}
	default:
		for _, command := range []string{"chromium", "google-chrome", "microsoft-edge"} {
			if path, err := exec.LookPath(command); err == nil {
				return path, nil
			}
		}
	}
	return "", errors.New("Microsoft Edge 또는 Google Chrome을 설치하세요.")
}

func run() error {
	for _, name := range []string{"bgm1.mp3", "bgm2.mp3", "bgm3.mp3"} {
		if _, err := fs.Stat(assets, "web/game/audio/"+name); err != nil {
			return fmt.Errorf("실행 파일에 %s 음원이 없습니다", name)
		}
	}
	chromium, err := browser()
	if err != nil {
		return err
	}
	listener, err := net.Listen("tcp4", "127.0.0.1:47823")
	if err != nil {
		return fmt.Errorf("게임이 이미 실행 중이거나 47823 포트가 사용 중입니다: %w", err)
	}
	root, err := fs.Sub(assets, "web")
	if err != nil {
		listener.Close()
		return err
	}
	files := http.FileServer(http.FS(root))
	server := &http.Server{
		ReadHeaderTimeout: 5 * time.Second,
		Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Host != "127.0.0.1:47823" || (!strings.HasPrefix(r.URL.Path, "/game/") &&
				!strings.HasPrefix(r.URL.Path, "/shared/")) {
				http.NotFound(w, r)
				return
			}
			w.Header().Set("X-Content-Type-Options", "nosniff")
			w.Header().Set("Cache-Control", "no-cache")
			if strings.HasSuffix(r.URL.Path, ".mjs") {
				w.Header().Set("Content-Type", "text/javascript; charset=utf-8")
			}
			files.ServeHTTP(w, r)
		}),
	}
	go server.Serve(listener)
	defer server.Close()

	config, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	profile := filepath.Join(config, "FestivalRhythm", "Profile")
	if err := os.MkdirAll(profile, 0700); err != nil {
		return err
	}
	command := exec.Command(chromium, "--app=http://127.0.0.1:47823/game/",
		"--user-data-dir="+profile, "--no-first-run", "--no-default-browser-check",
		"--start-maximized", "--disable-background-mode")
	return command.Run()
}

func main() {
	if err := run(); err != nil {
		log.Print(err)
		showError(err.Error())
		os.Exit(1)
	}
}
