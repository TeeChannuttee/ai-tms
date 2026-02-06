package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

func main() {
	baseURL := "http://localhost:8080/api/v1/customers"

	// 1. Create
	timestamp := fmt.Sprintf("%d", time.Now().UnixNano())
	createPayload := map[string]interface{}{
		"code":      "DBG-" + timestamp[12:],
		"name":      "Debug Delete",
		"address":   "Debug",
		"latitude":  10.0,
		"longitude": 100.0,
	}
	jsonData, _ := json.Marshal(createPayload)

	resp, err := http.Post(baseURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Printf("Create failed: %v\n", err)
		return
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	fmt.Printf("Create Status: %s\nBody: %s\n", resp.Status, string(body))

	var result map[string]interface{}
	json.Unmarshal(body, &result)
	id, ok := result["id"].(string)
	if !ok {
		fmt.Println("Failed to get ID")
		return
	}
	fmt.Printf("Created ID: %s\n", id)

	// 1.5 Create Dependent Order
	orderPayload := map[string]interface{}{
		"customer_id":      id,
		"order_number":     "ORD-DEBUG-" + id[:4],
		"pickup_address":   "Warehouse",
		"delivery_address": "Debug Address",
		"items":            1,
		"weight_kg":        10,
	}
	orderJson, _ := json.Marshal(orderPayload)
	ordResp, err := http.Post("http://localhost:8080/api/v1/orders", "application/json", bytes.NewBuffer(orderJson))
	if err != nil {
		fmt.Printf("Create Order failed: %v\n", err)
		return
	}
	defer ordResp.Body.Close()
	_, _ = io.ReadAll(ordResp.Body)
	fmt.Printf("Create Order Status: %s\n", ordResp.Status)

	// 2. Delete Customer
	req, _ := http.NewRequest("DELETE", baseURL+"/"+id, nil)
	client := &http.Client{}
	delResp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Delete failed: %v\n", err)
		return
	}
	defer delResp.Body.Close()
	delBody, _ := io.ReadAll(delResp.Body)
	fmt.Printf("Delete Status: %s\nBody: %s\n", delResp.Status, string(delBody))
}
