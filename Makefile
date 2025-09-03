# IAM File Server - Makefile
# Development and deployment automation

# Variables
NODE_VERSION := 22
PROJECT_NAME := iam-fileserver

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

.PHONY: help install dev build clean test setup check-env

# Default target
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo "$(GREEN)IAM File Server - Available Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)Environment Variables:$(NC)"
	@echo "  Create .env file from .env.example and configure BMW credentials"
	@echo ""

# Development Commands
install: ## Install all dependencies
	@echo "$(GREEN)Installing dependencies...$(NC)"
	@npm install
	@echo "$(GREEN)Dependencies installed successfully!$(NC)"

dev: install build-providers ## Start development servers (backend + frontend)
	@echo "$(GREEN)Starting development environment...$(NC)"
	@echo "$(YELLOW)Backend: http://localhost:3001$(NC)"
	@echo "$(YELLOW)Frontend: http://localhost:5173$(NC)"
	@npm run dev

dev-backend: install build-providers ## Start only backend development server
	@echo "$(GREEN)Starting backend development server...$(NC)"
	@npm run dev:backend

dev-frontend: install build-shared ## Start only frontend development server
	@echo "$(GREEN)Starting frontend development server...$(NC)"
	@npm run dev:frontend

build: install ## Build all packages for production
	@echo "$(GREEN)Building all packages...$(NC)"
	@npm run build
	@echo "$(GREEN)Build completed successfully!$(NC)"

build-shared: ## Build only shared package
	@echo "$(GREEN)Building shared package...$(NC)"
	@npm run build --workspace=shared

build-providers: build-shared ## Build only providers package
	@echo "$(GREEN)Building providers package...$(NC)"
	@npm run build --workspace=providers

build-backend: build-shared ## Build only backend
	@echo "$(GREEN)Building backend...$(NC)"
	@npm run build --workspace=backend

build-frontend: build-shared ## Build only frontend
	@echo "$(GREEN)Building frontend...$(NC)"
	@npm run build --workspace=frontend

health: ## Check application health
	@echo "$(GREEN)Checking application health...$(NC)"
	@curl -s http://localhost:3001/ping && echo " $(GREEN)✓ Application is running$(NC)" || echo " $(RED)✗ Application is not responding$(NC)"
	@curl -s http://localhost:3001/api/health | jq '.data.status' 2>/dev/null && echo "$(GREEN)✓ Health check passed$(NC)" || echo "$(YELLOW)⚠ Health check details not available$(NC)"

status: ## Show Docker container status
	@echo "$(GREEN)Container Status:$(NC)"
	@docker-compose -f $(COMPOSE_FILE) ps

shell: ## Open shell in running container
	@echo "$(GREEN)Opening shell in container...$(NC)"
	@docker-compose -f $(COMPOSE_FILE) exec fileserver sh

# Database Commands
db-backup: ## Backup SQLite database
	@echo "$(GREEN)Creating database backup...$(NC)"
	@mkdir -p backup
	@docker-compose -f $(COMPOSE_FILE) exec fileserver cp /app/data/fileserver.db /app/data/fileserver.db.backup
	@docker cp $$(docker-compose -f $(COMPOSE_FILE) ps -q fileserver):/app/data/fileserver.db.backup ./backup/fileserver-$$(date +%Y%m%d_%H%M%S).db
	@echo "$(GREEN)Database backup created in ./backup/$(NC)"

db-restore: ## Restore SQLite database (requires BACKUP_FILE variable)
ifndef BACKUP_FILE
	@echo "$(RED)Error: Please specify BACKUP_FILE variable$(NC)"
	@echo "$(YELLOW)Example: make db-restore BACKUP_FILE=backup/fileserver-20231201_120000.db$(NC)"
	@exit 1
endif
	@echo "$(GREEN)Restoring database from $(BACKUP_FILE)...$(NC)"
	@docker cp $(BACKUP_FILE) $$(docker-compose -f $(COMPOSE_FILE) ps -q fileserver):/app/data/fileserver.db
	@docker-compose -f $(COMPOSE_FILE) restart fileserver
	@echo "$(GREEN)Database restored successfully!$(NC)"

# Maintenance Commands
clean: ## Clean build artifacts and dependencies
	@echo "$(YELLOW)Cleaning project...$(NC)"
	@rm -rf node_modules */node_modules */dist dist build
	@rm -rf data downloads logs
	@echo "$(GREEN)Project cleaned!$(NC)"

fix-deps: clean install build-providers ## Fix dependency issues
	@echo "$(GREEN)Fixing dependency issues...$(NC)"
	@echo "$(GREEN)Dependencies fixed!$(NC)"

clean-soft: ## Clean only build artifacts
	@echo "$(YELLOW)Cleaning build artifacts...$(NC)"
	@rm -rf */dist dist build
	@echo "$(GREEN)Build artifacts cleaned!$(NC)"

update: ## Update all dependencies
	@echo "$(GREEN)Updating dependencies...$(NC)"
	@npm update
	@echo "$(GREEN)Dependencies updated!$(NC)"

# Setup Commands
setup: check-node ## Complete project setup
	@echo "$(GREEN)Setting up IAM File Server...$(NC)"
	@if [ ! -f .env ]; then \
		echo "$(YELLOW)Creating .env file from template...$(NC)"; \
		cp .env.example .env; \
		echo "$(RED)⚠ Please edit .env file with your BMW credentials!$(NC)"; \
	fi
	@make install
	@make build-providers
	@echo "$(GREEN)Setup completed!$(NC)"
	@echo "$(YELLOW)Next steps:$(NC)"
	@echo "  1. Edit .env file with BMW credentials"
	@echo "  2. Run 'make dev' for development"
	@echo "  3. Run 'make docker-dev' for Docker development"

setup-prod: setup ## Setup for production deployment
	@echo "$(GREEN)Production setup...$(NC)"
	@if [ ! -f .env ]; then \
		echo "$(RED)Error: .env file is required for production!$(NC)"; \
		exit 1; \
	fi
	@make build
	@echo "$(GREEN)Production setup completed!$(NC)"
	@echo "$(YELLOW)Run 'make docker-prod' to start production environment$(NC)"

# Testing Commands
test: ## Run tests (when implemented)
	@echo "$(YELLOW)Tests not yet implemented$(NC)"
	# @npm test

lint: ## Run linting (when implemented)
	@echo "$(YELLOW)Linting not yet implemented$(NC)"
	# @npm run lint

# Environment Checks
check-node: ## Check Node.js version
	@echo "$(GREEN)Checking Node.js version...$(NC)"
	@node_version=$$(node -v | sed 's/v//'); \
	if [ "$$(echo "$$node_version" | cut -d. -f1)" -ge "$(NODE_VERSION)" ]; then \
		echo "$(GREEN)✓ Node.js $$node_version (required: $(NODE_VERSION)+)$(NC)"; \
	else \
		echo "$(RED)✗ Node.js $$node_version found, $(NODE_VERSION)+ required$(NC)"; \
		exit 1; \
	fi

check-docker: ## Check Docker installation
	@echo "$(GREEN)Checking Docker installation...$(NC)"
	@docker --version > /dev/null 2>&1 && echo "$(GREEN)✓ Docker is installed$(NC)" || (echo "$(RED)✗ Docker is not installed$(NC)" && exit 1)
	@docker-compose --version > /dev/null 2>&1 && echo "$(GREEN)✓ Docker Compose is installed$(NC)" || (echo "$(RED)✗ Docker Compose is not installed$(NC)" && exit 1)

check-env: ## Check environment configuration
	@echo "$(GREEN)Checking environment configuration...$(NC)"
	@if [ ! -f .env ]; then \
		echo "$(RED)✗ .env file not found!$(NC)"; \
		echo "$(YELLOW)Run 'make setup' to create it from template$(NC)"; \
		exit 1; \
	else \
		echo "$(GREEN)✓ .env file found$(NC)"; \
	fi

# Development Helpers
watch-logs: ## Watch application logs in development
	@echo "$(GREEN)Watching logs... (Press Ctrl+C to stop)$(NC)"
	@tail -f logs/*.log 2>/dev/null || echo "$(YELLOW)No log files found yet$(NC)"

tunnel: ## Create ngrok tunnel for local development (requires ngrok)
	@echo "$(GREEN)Creating ngrok tunnel...$(NC)"
	@command -v ngrok >/dev/null 2>&1 || (echo "$(RED)ngrok is required but not installed$(NC)" && exit 1)
	@ngrok http 3001

# Information Commands
info: ## Show project information
	@echo "$(GREEN)IAM File Server Information$(NC)"
	@echo ""
	@echo "$(YELLOW)Project:$(NC) IAM File Server"
	@echo "$(YELLOW)Version:$(NC) 1.0.0"
	@echo "$(YELLOW)Domain:$(NC) fileserver.terhorst.io"
	@echo "$(YELLOW)License:$(NC) Proprietary (IAM-NET.eu)"
	@echo ""
	@echo "$(YELLOW)Architecture:$(NC)"
	@echo "  Backend:  Express.js + TypeScript"
	@echo "  Frontend: React + TypeScript + Vite"
	@echo "  Database: SQLite"
	@echo "  Styling:  TailwindCSS"
	@echo ""
	@echo "$(YELLOW)Ports:$(NC)"
	@echo "  Development Backend:  3001"
	@echo "  Development Frontend: 5173"
	@echo "  Production:           80/443"
	@echo ""

urls: ## Show development URLs
	@echo "$(GREEN)Development URLs:$(NC)"
	@echo "$(YELLOW)Frontend:$(NC) http://localhost:5173"
	@echo "$(YELLOW)Backend API:$(NC) http://localhost:3001/api"
	@echo "$(YELLOW)Health Check:$(NC) http://localhost:3001/api/health"
	@echo "$(YELLOW)Production:$(NC) https://fileserver.terhorst.io"

reset: clean docker-clean ## Complete reset (removes all data!)
	@echo "$(RED)⚠ WARNING: This will delete ALL data including downloads and database!$(NC)"
	@echo "Press Ctrl+C to cancel, or wait 10 seconds to continue..."
	@sleep 10
	@rm -rf data downloads logs backup
	@echo "$(GREEN)Complete reset finished.$(NC)"
