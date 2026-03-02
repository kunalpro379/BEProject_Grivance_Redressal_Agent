# Fix Pydantic Import Error

## Error
```
ImportError: cannot import name 'Secret' from 'pydantic'
```

## Cause
Version mismatch between `pydantic` and `pydantic-settings`. The `Secret` class was moved/renamed in newer versions of pydantic.

## Solution

### Option 1: Update pydantic-settings (Recommended)
```bash
conda activate agents
pip install --upgrade pydantic-settings
```

### Option 2: Pin specific compatible versions
Update `requirements.txt`:
```
pydantic==2.9.2
pydantic-settings==2.5.2
```

Then reinstall:
```bash
conda activate agents
pip install -r requirements.txt --force-reinstall
```

### Option 3: Downgrade crewai (if issue persists)
```bash
conda activate agents
pip install crewai==0.28.0
```

## Quick Fix Command
```bash
conda activate agents
pip install --upgrade pydantic pydantic-settings pydantic-core
```

## Verify Fix
```bash
conda activate agents
python -c "from pydantic_settings import BaseSettings; print('Success!')"
```

## If Still Failing
Try creating a fresh conda environment:
```bash
conda deactivate
conda create -n agents_new python=3.11 -y
conda activate agents_new
pip install -r requirements.txt
```
