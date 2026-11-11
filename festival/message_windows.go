package main

import (
	"syscall"
	"unsafe"
)

func showError(message string) {
	text, _ := syscall.UTF16PtrFromString(message)
	title, _ := syscall.UTF16PtrFromString("축제 리듬게임")
	box := syscall.NewLazyDLL("user32.dll").NewProc("MessageBoxW")
	box.Call(0, uintptr(unsafe.Pointer(text)), uintptr(unsafe.Pointer(title)), 0x10)
}
