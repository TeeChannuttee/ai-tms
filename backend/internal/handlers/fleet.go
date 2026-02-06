package handlers

import (
	"net/http"

	"github.com/ai-tms/backend/internal/database"
	"github.com/ai-tms/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// VehicleDTO represents vehicle data transfer object
type VehicleDTO struct {
	ID                string  `json:"id"`
	LicensePlate      string  `json:"license_plate"`
	Type              string  `json:"type"`
	Capacity          float64 `json:"capacity"`
	CostPerKm         float64 `json:"cost_per_km"`
	Status            string  `json:"status"`
	CurrentDriverID   *string `json:"current_driver_id,omitempty"`
	CurrentDriverName *string `json:"current_driver_name,omitempty"`
}

// DepotDTO represents depot data transfer object
type DepotDTO struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Location string `json:"location"`
}

// ListVehicles lists all vehicles
func ListVehicles(c *gin.Context) {
	status := c.Query("status")

	query := database.DB
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var vehicles []models.Vehicle
	if err := query.Preload("CurrentDriver.User").Find(&vehicles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch vehicles"})
		return
	}

	vehicleDTOs := make([]VehicleDTO, 0, len(vehicles))
	for _, v := range vehicles {
		dto := VehicleDTO{
			ID:           v.ID.String(),
			LicensePlate: v.LicensePlate,
			Type:         v.VehicleType,
			Capacity:     float64(v.CapacityKg),
			CostPerKm:    v.CostPerKm,
			Status:       v.Status,
		}
		if v.CurrentDriverID != nil {
			idStr := v.CurrentDriverID.String()
			dto.CurrentDriverID = &idStr
			if v.CurrentDriver != nil && v.CurrentDriver.User != nil {
				name := v.CurrentDriver.User.Name
				dto.CurrentDriverName = &name
			}
		}
		vehicleDTOs = append(vehicleDTOs, dto)
	}

	c.JSON(http.StatusOK, vehicleDTOs)
}

// CreateVehicle creates a new vehicle
func CreateVehicle(c *gin.Context) {
	var req struct {
		LicensePlate string  `json:"license_plate" binding:"required"`
		Type         string  `json:"type" binding:"required"`
		Capacity     float64 `json:"capacity" binding:"required"`
		CostPerKm    float64 `json:"cost_per_km" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	vehicle := models.Vehicle{
		ID:           uuid.New(),
		LicensePlate: req.LicensePlate,
		VehicleType:  req.Type,
		CapacityKg:   int(req.Capacity),
		CostPerKm:    req.CostPerKm,
		Status:       "available",
	}

	if err := database.DB.Create(&vehicle).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create vehicle"})
		return
	}

	c.JSON(http.StatusCreated, VehicleDTO{
		ID:           vehicle.ID.String(),
		LicensePlate: vehicle.LicensePlate,
		Type:         vehicle.VehicleType,
		Capacity:     float64(vehicle.CapacityKg),
		CostPerKm:    vehicle.CostPerKm,
		Status:       vehicle.Status,
	})
}

// UpdateVehicle updates a vehicle
func UpdateVehicle(c *gin.Context) {
	vehicleID := c.Param("id")

	var req struct {
		Status    string  `json:"status"`
		Capacity  float64 `json:"capacity"`
		CostPerKm float64 `json:"cost_per_km"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := make(map[string]interface{})
	if req.Status != "" {
		updates["status"] = req.Status
	}
	if req.Capacity > 0 {
		updates["capacity"] = req.Capacity
	}
	if req.CostPerKm > 0 {
		updates["cost_per_km"] = req.CostPerKm
	}

	if err := database.DB.Model(&models.Vehicle{}).Where("id = ?", vehicleID).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update vehicle"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Vehicle updated successfully"})
}

// DeleteVehicle deletes a vehicle
func DeleteVehicle(c *gin.Context) {
	vehicleID := c.Param("id")

	if err := database.DB.Delete(&models.Vehicle{}, "id = ?", vehicleID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete vehicle"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Vehicle deleted successfully"})
}

// LinkVehicle links a driver to a vehicle
func LinkVehicle(c *gin.Context) {
	vehicleID := c.Param("id")
	var req struct {
		DriverID string `json:"driver_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	driverUUID, err := uuid.Parse(req.DriverID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid driver_id"})
		return
	}

	// Check if already linked to someone else
	var v models.Vehicle
	if err := database.DB.First(&v, "id = ?", vehicleID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Vehicle not found"})
		return
	}

	if v.CurrentDriverID != nil && v.CurrentDriverID.String() != req.DriverID {
		c.JSON(http.StatusConflict, gin.H{"error": "Vehicle already linked to another driver"})
		return
	}

	if err := database.DB.Model(&models.Vehicle{}).Where("id = ?", vehicleID).Update("current_driver_id", driverUUID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to link vehicle"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Vehicle linked successfully"})
}

// UnlinkVehicle unlinks any driver from a vehicle
func UnlinkVehicle(c *gin.Context) {
	vehicleID := c.Param("id")

	if err := database.DB.Model(&models.Vehicle{}).Where("id = ?", vehicleID).Update("current_driver_id", nil).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unlink vehicle"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Vehicle unlinked successfully"})
}

// ListDepots lists all depots
func ListDepots(c *gin.Context) {
	var depots []models.Depot
	if err := database.DB.Find(&depots).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch depots"})
		return
	}

	depotDTOs := make([]DepotDTO, 0, len(depots))
	for _, d := range depots {
		depotDTOs = append(depotDTOs, DepotDTO{
			ID:       d.ID.String(),
			Name:     d.Name,
			Location: d.Location,
		})
	}

	c.JSON(http.StatusOK, depotDTOs)
}

// CreateDepot creates a new depot
func CreateDepot(c *gin.Context) {
	var req struct {
		Name     string `json:"name" binding:"required"`
		Location string `json:"location" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	depot := models.Depot{
		ID:       uuid.New(),
		Name:     req.Name,
		Location: req.Location,
	}

	if err := database.DB.Create(&depot).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create depot"})
		return
	}

	c.JSON(http.StatusCreated, DepotDTO{
		ID:       depot.ID.String(),
		Name:     depot.Name,
		Location: depot.Location,
	})
}
