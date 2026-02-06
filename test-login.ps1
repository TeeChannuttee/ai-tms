$body = @{
    email = "driver001@ai-tms.com"
    password = "driver123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $body

Write-Host "Login Response:"
$response | ConvertTo-Json -Depth 5
