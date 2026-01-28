@echo off
REM Batch script to convert hotspot rasters to web-ready COG format
REM Created for Puerto Rico Hotspot Analysis Project

echo ========================================
echo Hotspot Raster Conversion Script
echo ========================================
echo.

REM Set PROJ library path to avoid conflicts
set PROJ_LIB=C:\OSGeo4W\share\proj

REM Set paths
set GDAL_WARP="C:\OSGeo4W\bin\gdalwarp.exe"
set GDAL_TRANSLATE="C:\OSGeo4W\bin\gdal_translate.exe"
set INPUT_DIR=input_rasters
set TEMP_DIR=temp_reprojected
set OUTPUT_DIR=public\data

REM Create directories if they don't exist
if not exist "%TEMP_DIR%" mkdir "%TEMP_DIR%"
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

echo.
echo Processing all TIF files in %INPUT_DIR%...
echo.

REM Process each .tif file in input directory
for %%f in (%INPUT_DIR%\*.tif) do (
    echo ========================================
    echo Processing: %%~nxf
    echo ========================================
    
    REM Step 1: Reproject to EPSG:4326
    echo Step 1/2: Reprojecting to WGS84...
    %GDAL_WARP% -t_srs EPSG:4326 -r bilinear "%%f" "%TEMP_DIR%\%%~nf_reprojected.tif"
    
    if errorlevel 1 (
        echo ERROR: Reprojection failed for %%~nxf
        echo Skipping to next file...
        echo.
    ) else (
        REM Step 2: Convert to COG
        echo Step 2/2: Converting to Cloud-Optimized GeoTIFF...
        %GDAL_TRANSLATE% -of COG -co COMPRESS=DEFLATE -co LEVEL=9 -co PREDICTOR=2 -co BLOCKSIZE=512 -co OVERVIEWS=AUTO -co OVERVIEW_RESAMPLING=AVERAGE "%TEMP_DIR%\%%~nf_reprojected.tif" "%OUTPUT_DIR%\%%~nf_web.tif"
        
        if errorlevel 1 (
            echo ERROR: COG conversion failed for %%~nxf
            echo.
        ) else (
            echo SUCCESS: %%~nf_web.tif created
            echo.
        )
    )
)

echo ========================================
echo Conversion Complete!
echo ========================================
echo.
echo Output files are in: %OUTPUT_DIR%
echo Temporary files are in: %TEMP_DIR%
echo.
echo You can now:
echo 1. Delete the temp_reprojected folder to save space
echo 2. Run 'npm run build' to rebuild your project
echo 3. Run 'netlify deploy --prod --dir=dist' to update your site
echo.
pause