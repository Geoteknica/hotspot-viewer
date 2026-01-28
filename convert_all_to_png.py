import subprocess
import json
from pathlib import Path

# Paths
GDALDEM = r"C:\OSGeo4W\bin\gdaldem.exe"
GDAL_TRANSLATE = r"C:\OSGeo4W\bin\gdal_translate.exe"
COLOR_RAMP = "color_ramp.txt"
INPUT_DIR = Path("public/data")
OUTPUT_DIR = Path("public/data")

# Ensure output directory exists
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

print("Converting COG files to PNG with color ramp...")
print("=" * 60)

# Get all _web.tif files
tif_files = list(INPUT_DIR.glob("*_web.tif"))
print(f"Found {len(tif_files)} files to convert\n")

for tif_file in sorted(tif_files):
    layer_name = tif_file.stem.replace("_web", "")
    temp_file = f"temp_{layer_name}_colored.tif"
    output_png = OUTPUT_DIR / f"{layer_name}.png"
    
    print(f"Processing: {tif_file.name}")
    print(f"  Output: {output_png.name}")
    
    # Step 1: Apply color ramp
    cmd1 = [
        GDALDEM, "color-relief",
        str(tif_file),
        COLOR_RAMP,
        temp_file,
        "-alpha"
    ]
    
    result1 = subprocess.run(cmd1, capture_output=True, text=True)
    
    if result1.returncode != 0:
        print(f"  ✗ ERROR applying color: {result1.stderr}")
        continue
    
    # Step 2: Convert to PNG
    cmd2 = [
        GDAL_TRANSLATE,
        "-of", "PNG",
        temp_file,
        str(output_png)
    ]
    
    result2 = subprocess.run(cmd2, capture_output=True, text=True)
    
    if result2.returncode != 0:
        print(f"  ✗ ERROR converting to PNG: {result2.stderr}")
    else:
        print(f"  ✓ Success: {output_png.name}")
        # Clean up temp file
        Path(temp_file).unlink(missing_ok=True)
    
    print()

print("=" * 60)
print("PNG conversion complete!")
print("\nNow extracting bounds...")
print("=" * 60)

# Now extract bounds for all PNG files
def get_raster_bounds(tif_path):
    """Extract bounds from a GeoTIFF file using gdalinfo"""
    GDALINFO = r"C:\OSGeo4W\bin\gdalinfo.exe"
    cmd = [GDALINFO, str(tif_path)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        return None
    
    output = result.stdout
    upper_left = None
    lower_right = None
    
    for line in output.split('\n'):
        if 'Upper Left' in line:
            try:
                coords = line.split('(')[1].split(')')[0]
                lon, lat = [float(x.strip()) for x in coords.split(',')]
                upper_left = [lat, lon]
            except:
                pass
        
        if 'Lower Right' in line:
            try:
                coords = line.split('(')[1].split(')')[0]
                lon, lat = [float(x.strip()) for x in coords.split(',')]
                lower_right = [lat, lon]
            except:
                pass
    
    if upper_left and lower_right:
        south = lower_right[0]
        west = upper_left[1]
        north = upper_left[0]
        east = lower_right[1]
        return [[south, west], [north, east]]
    
    return None

# Extract bounds
metadata = {}

for tif_file in sorted(INPUT_DIR.glob("*_web.tif")):
    layer_name = tif_file.stem.replace("_web", "")
    png_file = OUTPUT_DIR / f"{layer_name}.png"
    
    # Only add to metadata if PNG exists
    if png_file.exists():
        print(f"Extracting bounds: {tif_file.name}")
        bounds = get_raster_bounds(tif_file)
        
        if bounds:
            metadata[layer_name] = {
                "bounds": bounds,
                "file": f"{layer_name}.png"
            }
            print(f"  ✓ Bounds extracted")
        else:
            print(f"  ✗ Failed to extract bounds")

# Save metadata
metadata_file = OUTPUT_DIR / "raster_metadata.json"
with open(metadata_file, 'w') as f:
    json.dump(metadata, f, indent=2)

print("\n" + "=" * 60)
print(f"Complete! Processed {len(metadata)} layers")
print(f"Metadata saved to: {metadata_file}")
print("\nMetadata:")
print(json.dumps(metadata, indent=2))