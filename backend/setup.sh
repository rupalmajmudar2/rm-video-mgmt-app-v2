#!/bin/bash

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
python -m pip install --upgrade pip

# Install requirements
python -m pip install -r requirements.txt

# Initialize alembic
alembic revision --autogenerate -m "Initial migration"

echo "Setup complete! To activate the virtual environment, run:"
echo "source venv/bin/activate"
