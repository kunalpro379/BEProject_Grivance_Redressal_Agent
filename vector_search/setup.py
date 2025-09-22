#!/usr/bin/env python3
"""
Setup script for Vector Search Database Analyzer
"""

import subprocess
import sys
import os

def install_requirements():
    """Install required packages"""
    try:
        print("📦 Installing required packages...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Packages installed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error installing packages: {e}")
        return False

def test_imports():
    """Test if required packages can be imported"""
    try:
        import psycopg2
        print("✅ psycopg2 imported successfully")
        return True
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False

def main():
    print("🔧 Vector Search Database Analyzer Setup")
    print("=" * 50)
    
    # Install requirements
    if install_requirements():
        print("\n📋 Testing imports...")
        if test_imports():
            print("\n🎉 Setup complete!")
            print("\n📝 Available scripts:")
            print("  • python test_connections.py - Test database connections")
            print("  • python quick_schema.py - Show quick schema overview")
            print("  • python database_analyzer.py - Full detailed analysis")
        else:
            print("\n❌ Setup failed. Please check the error messages above")
    else:
        print("\n❌ Setup failed. Please check the error messages above")

if __name__ == "__main__":
    main()
