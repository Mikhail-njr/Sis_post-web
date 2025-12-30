#!/bin/bash

# Script to backup or recover TupreX folder

ORIGINAL_PATH="C:/Users/Debbye/Documents/NFS Most Wanted/TupreX"
BACKUP_DIR="$ORIGINAL_PATH/tuprex_save"
BACKUP_FILE="$BACKUP_DIR/TupreX"

echo "TupreX Backup/Restore Script"
echo "1. Backup TupreX folder"
echo "2. Restore TupreX folder"
echo "Choose an option (1 or 2):"
read -r option

case $option in
    1)
        echo "Backing up TupreX..."
        mkdir -p "$BACKUP_DIR"
        if [ -d "$ORIGINAL_PATH" ]; then
            cp -r "$ORIGINAL_PATH" "$BACKUP_DIR/"
            echo "Backup completed: $BACKUP_FILE"
        else
            echo "Error: Original folder not found at $ORIGINAL_PATH"
        fi
        ;;
    2)
        echo "Restoring TupreX..."
        if [ -d "$BACKUP_FILE" ]; then
            cp -r "$BACKUP_FILE" "C:/Users/Debbye/Documents/NFS Most Wanted/"
            echo "Restore completed: $ORIGINAL_PATH"
        else
            echo "Error: Backup folder not found at $BACKUP_FILE"
        fi
        ;;
    *)
        echo "Invalid option. Exiting."
        ;;
esac