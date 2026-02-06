package handlers

import (
	"fmt"
	"net/http"

	"github.com/ai-tms/backend/internal/database"
	"github.com/ai-tms/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CustomerDTO represents customer data transfer object
type CustomerDTO struct {
	ID      string `json:"id"`
	Code    string `json:"code"`
	Name    string `json:"name"`
	Address string `json:"address"`
}

// ListCustomers lists all customers
func ListCustomers(c *gin.Context) {
	var customers []models.Customer
	if err := database.DB.Find(&customers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch customers"})
		return
	}

	customerDTOs := make([]CustomerDTO, 0, len(customers))
	for _, cust := range customers {
		customerDTOs = append(customerDTOs, CustomerDTO{
			ID:      cust.ID.String(),
			Code:    cust.Code,
			Name:    cust.Name,
			Address: cust.Address,
		})
	}

	c.JSON(http.StatusOK, customerDTOs)
}

// GetCustomer retrieves a specific customer
func GetCustomer(c *gin.Context) {
	id := c.Param("id")
	var customer models.Customer
	if err := database.DB.First(&customer, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Customer not found"})
		return
	}

	c.JSON(http.StatusOK, CustomerDTO{
		ID:      customer.ID.String(),
		Code:    customer.Code,
		Name:    customer.Name,
		Address: customer.Address,
	})
}

// CreateCustomer creates a new customer
func CreateCustomer(c *gin.Context) {
	var input models.Customer
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set defaults
	if input.ID == uuid.Nil {
		input.ID = uuid.New()
	}

	// Set PostGIS location
	input.Location = fmt.Sprintf("POINT(%f %f)", input.Longitude, input.Latitude)

	if err := database.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create customer: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, input)
}

// UpdateCustomer updates an existing customer
func UpdateCustomer(c *gin.Context) {
	id := c.Param("id")
	var customer models.Customer
	if err := database.DB.First(&customer, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Customer not found"})
		return
	}

	var input models.Customer
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	customer.Name = input.Name
	customer.Code = input.Code
	customer.Address = input.Address
	customer.ContactPhone = input.ContactPhone
	customer.ContactEmail = input.ContactEmail
	customer.Latitude = input.Latitude
	customer.Longitude = input.Longitude
	customer.Location = fmt.Sprintf("POINT(%f %f)", input.Longitude, input.Latitude)

	if err := database.DB.Save(&customer).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update customer: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, customer)
}

// DeleteCustomer deletes a customer
func DeleteCustomer(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.Customer{}, "id = ?", id).Error; err != nil {
		fmt.Printf("Error deleting customer: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete customer: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Customer deleted successfully"})
}
