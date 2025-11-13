"""
Setup script to download and prepare all Kaggle datasets for MediPredict
Downloads: Heart Disease, Stroke Prediction, Parkinson's, and Diseases and Symptoms datasets
Run this script to download all datasets from Kaggle
"""

import os
import json
import subprocess
import pandas as pd
from pathlib import Path

# Dataset configurations
DATASETS = [
    {
        'name': 'dhivyeshrk/diseases-and-symptoms-dataset',
        'description': 'Diseases and Symptoms Dataset',
        'filename': 'diseases_symptoms.csv'
    },
    {
        'name': 'johnsmith88/heart-disease-dataset',
        'description': 'Heart Disease Indicators Dataset',
        'filename': 'heart_disease.csv'
    },
    {
        'name': 'fedesoriano/stroke-prediction-dataset',
        'description': 'Stroke Prediction Dataset',
        'filename': 'stroke.csv'
    },
    {
        'name': 'debasishdotcom/parkinson-disease-detection',
        'description': "Parkinson's Disease Dataset",
        'filename': 'parkinsons.csv'
    }
]

def setup_kaggle_api():
    """Setup Kaggle API credentials"""
    kaggle_dir = Path.home() / '.kaggle'
    kaggle_json = kaggle_dir / 'kaggle.json'
    
    if not kaggle_json.exists():
        print("\n" + "="*60)
        print("KAGGLE API SETUP REQUIRED")
        print("="*60)
        print("\n1. Go to https://www.kaggle.com/settings/account")
        print("2. Click 'Create New API Token'")
        print("3. This downloads kaggle.json")
        print("4. Move it to ~/.kaggle/kaggle.json")
        print("5. Run: chmod 600 ~/.kaggle/kaggle.json")
        print("\nThen run this script again.\n")
        return False
    
    # Set permissions
    os.chmod(kaggle_json, 0o600)
    return True

def download_dataset(dataset_config):
    """Download a specific dataset from Kaggle"""
    data_dir = Path(__file__).parent / 'data'
    data_dir.mkdir(exist_ok=True)
    
    dataset_name = dataset_config['name']
    description = dataset_config['description']
    
    print(f"\n📥 Downloading {description} ({dataset_name})...")
    try:
        result = subprocess.run(
            ['kaggle', 'datasets', 'download', '-d', dataset_name, '-p', str(data_dir)],
            check=True,
            capture_output=True,
            text=True
        )
        print(f"✓ {description} downloaded successfully!")
        
        # Extract if zip
        import zipfile
        for file in data_dir.glob('*.zip'):
            print(f"   Extracting {file.name}...")
            with zipfile.ZipFile(file, 'r') as zip_ref:
                zip_ref.extractall(data_dir)
            file.unlink()
        
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Error downloading {description}: {e.stderr if e.stderr else e}")
        return False
    except Exception as e:
        print(f"✗ Unexpected error downloading {description}: {e}")
        return False

def explore_dataset():
    """Explore and display dataset information"""
    data_dir = Path(__file__).parent / 'data'
    
    print("\n" + "="*60)
    print("DATASET EXPLORATION")
    print("="*60)
    
    csv_files = list(data_dir.glob('*.csv'))
    
    if not csv_files:
        print("No CSV files found in data directory")
        return
    
    for csv_file in csv_files:
        print(f"\n📄 File: {csv_file.name}")
        try:
            df = pd.read_csv(csv_file, nrows=1000)  # Sample for exploration
            print(f"   Shape: {df.shape[0]} rows × {df.shape[1]} columns")
            print(f"   Columns: {', '.join(df.columns.tolist()[:10])}{'...' if len(df.columns) > 10 else ''}")
            print(f"   Missing values: {df.isnull().sum().sum()} total")
            if len(df) > 0:
                print(f"   Sample data:")
                print(df.head(2).to_string())
        except Exception as e:
            print(f"   Error reading file: {e}")

def main():
    """Main setup function"""
    print("\n" + "="*60)
    print("MEDIPREDICT - KAGGLE DATASET SETUP")
    print("="*60)
    print("\nThis script will download the following datasets:")
    for i, ds in enumerate(DATASETS, 1):
        print(f"  {i}. {ds['description']} ({ds['name']})")
    
    # Check Kaggle API
    if not setup_kaggle_api():
        return
    
    # Download all datasets
    print("\n" + "="*60)
    print("DOWNLOADING DATASETS")
    print("="*60)
    
    downloaded = 0
    for dataset_config in DATASETS:
        if download_dataset(dataset_config):
            downloaded += 1
    
    print(f"\n✓ Downloaded {downloaded}/{len(DATASETS)} datasets")
    
    # Explore datasets
    explore_dataset()
    
    print("\n" + "="*60)
    print("✓ Setup complete! You can now run: python train.py")
    print("="*60 + "\n")

if __name__ == '__main__':
    main()
