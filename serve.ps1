# Lightweight zero-dependency HTTP server in native PowerShell
# Uses .NET HttpListener to serve Smart Notes locally

param(
    [int]$Port = 8080
)

$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$Prefix = "http://localhost:$Port/"

$Listener = New-Object System.Net.HttpListener
$Listener.Prefixes.Add($Prefix)

try {
    $Listener.Start()
    Write-Host "=================================================" -ForegroundColor Cyan
    Write-Host "  Smart Notes Server Running at: $Prefix" -ForegroundColor Green
    Write-Host "  Press Ctrl+C in terminal to stop server" -ForegroundColor Yellow
    Write-Host "=================================================" -ForegroundColor Cyan
} catch {
    Write-Warning "Could not bind to port $Port. Trying $Port + 1..."
    $Port = $Port + 1
    $Prefix = "http://localhost:$Port/"
    $Listener = New-Object System.Net.HttpListener
    $Listener.Prefixes.Add($Prefix)
    $Listener.Start()
    Write-Host "  Smart Notes Server Running at: $Prefix" -ForegroundColor Green
}

$MimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".md"   = "text/markdown; charset=utf-8"
}

while ($Listener.IsListening) {
    try {
        $Context = $Listener.GetContext()
        $Request = $Context.Request
        $Response = $Context.Response

        $UrlPath = $Request.Url.LocalPath
        if ($UrlPath -eq "/" -or $UrlPath -eq "") {
            $UrlPath = "/index.html"
        }

        $FilePath = Join-Path $PSScriptRoot ($UrlPath.TrimStart("/").Replace("/", [IO.Path]::DirectorySeparatorChar))

        if (Test-Path $FilePath -PathType Leaf) {
            $Ext = [IO.Path]::GetExtension($FilePath).ToLower()
            $ContentType = $MimeTypes[$Ext]
            if (-not $ContentType) { $ContentType = "application/octet-stream" }
            $Response.ContentType = $ContentType

            $Bytes = [IO.File]::ReadAllBytes($FilePath)
            $Response.ContentLength64 = $Bytes.Length
            $Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
        } else {
            $Response.StatusCode = 404
            $NotFoundBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $UrlPath")
            $Response.OutputStream.Write($NotFoundBytes, 0, $NotFoundBytes.Length)
        }
        $Response.OutputStream.Close()
    } catch {
        # Loop continuation
    }
}
