#!/bin/bash

# Library Watchdog Script
# Automatically checks and reinstalls libpangoft2-1.0-0 if missing
# Runs every 5 minutes to ensure PDF generation functionality

LOG_FILE="/var/log/library-watchdog.log"
LIBRARY_NAME="libpangoft2-1.0-0"

# Function to log messages with timestamp
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check if library is installed
check_library() {
    dpkg -l | grep -q "^ii.*${LIBRARY_NAME}"
    return $?
}

# Function to install library
install_library() {
    log_message "WARNING: ${LIBRARY_NAME} is missing! Starting installation..."
    
    # Update package list
    sudo apt-get update >> "$LOG_FILE" 2>&1
    
    # Install the library
    sudo apt-get install -y "${LIBRARY_NAME}" >> "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
        log_message "SUCCESS: ${LIBRARY_NAME} installed successfully"
        
        # Restart backend to ensure it picks up the library
        log_message "Restarting backend service..."
        sudo supervisorctl restart backend >> "$LOG_FILE" 2>&1
        
        if [ $? -eq 0 ]; then
            log_message "SUCCESS: Backend restarted successfully"
        else
            log_message "ERROR: Failed to restart backend"
        fi
    else
        log_message "ERROR: Failed to install ${LIBRARY_NAME}"
    fi
}

# Main watchdog loop
log_message "=== Library Watchdog Started ==="

while true; do
    if check_library; then
        log_message "✓ ${LIBRARY_NAME} is present"
    else
        log_message "✗ ${LIBRARY_NAME} is MISSING!"
        install_library
    fi
    
    # Wait 5 minutes before next check
    sleep 300
done
