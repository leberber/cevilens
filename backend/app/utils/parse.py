import io

import pandas as pd


def parse_file(file_bytes: bytes, filename: str) -> pd.DataFrame:
    """Receives raw bytes from FastAPI UploadFile, returns cleaned DataFrame."""
    # Try header=1 first (legacy format with a title row), fall back to header=0
    buf = io.BytesIO(file_bytes)
    df = pd.read_excel(buf, header=1)
    df.columns = df.columns.str.strip().str.replace('\n', '', regex=False)
    if 'Date' not in df.columns:
        buf.seek(0)
        df = pd.read_excel(buf, header=0)
        df.columns = df.columns.str.strip().str.replace('\n', '', regex=False)
    df['Date'] = pd.to_datetime(df['Date'], dayfirst=True, errors='coerce')
    return df
