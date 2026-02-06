package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

func main() {
	url := "http://localhost:8080/api/v1/auth/login"

	creds := map[string]string{
		"email":    "driver001@ai-tms.com",
		"password": "driver123",
	}

	jsonData, _ := json.Marshal(creds)
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Printf("Request failed: %v\n", err)
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Printf("Status: %s\n", resp.Status)
	fmt.Printf("Body: %s\n", string(body))

	// Try Admin
	fmt.Println("\nTesting Admin...")
	adminCreds := map[string]string{
		"email":    "admin@ai-tms.com",
		"password": "admin123",
	}
	adminJson, _ := json.Marshal(adminCreds)
	adminResp, _ := http.Post(url, "application/json", bytes.NewBuffer(adminJson))
	adminBody, _ := io.ReadAll(adminResp.Body)
	fmt.Printf("Admin Status: %s\n", adminResp.Status)
	fmt.Printf("Admin Body: %s\n", string(adminBody))
}
