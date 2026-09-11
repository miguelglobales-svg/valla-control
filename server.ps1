# Servidor TCP Nativo para Vallas Control PWA (Soporta localhost, IP local y túneles HTTPS)
param(
    [int]$Port = 8080
)

$Host.UI.RawUI.WindowTitle = "Servidor Vallas Control PWA"
$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

$localIp = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi*", "Ethernet*" -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress
if (-not $localIp) { $localIp = "127.0.0.1" }

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
try {
    $listener.Start()
} catch {
    $Port = 8081
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
    $listener.Start()
}

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "   SISTEMA DE CONTROL DE VALLAS PUBLICITARIAS - PWA     " -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "-> En tu COMPUTADORA:" -ForegroundColor White
Write-Host "   http://localhost:$Port" -ForegroundColor Yellow
Write-Host ""
Write-Host "-> En tu CELULAR ANDROID (misma red local):" -ForegroundColor White
Write-Host "   http://$($localIp):$Port" -ForegroundColor Yellow
Write-Host ""
Write-Host "Presiona Ctrl + C para detener." -ForegroundColor Gray
Write-Host "=========================================================" -ForegroundColor Cyan

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".ico"  = "image/x-icon"
}

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        $state = [PSCustomObject]@{
            Client = $client
            Root = $root
            Types = $mimeTypes
        }
        [System.Threading.ThreadPool]::QueueUserWorkItem([System.Threading.WaitCallback]{
            param($s)
            $c = $s.Client
            $r = $s.Root
            $t = $s.Types
            try {
                $stream = $c.GetStream()
                $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
                $requestLine = $reader.ReadLine()
                if (-not $requestLine) { $c.Close(); return }

                $parts = $requestLine.Split(" ")
                if ($parts.Length -lt 2) { $c.Close(); return }

                $rawPath = $parts[1].Split("?")[0].TrimStart('/')
                if ([string]::IsNullOrWhiteSpace($rawPath) -or $rawPath -eq "/") {
                    $rawPath = "index.html"
                }

                $filePath = [System.IO.Path]::Combine($r, $rawPath)
                $normalizedRoot = [System.IO.Path]::GetFullPath($r)
                $normalizedFile = [System.IO.Path]::GetFullPath($filePath)

                if (-not $normalizedFile.StartsWith($normalizedRoot)) {
                    $msg = [System.Text.Encoding]::UTF8.GetBytes("HTTP/1.1 403 Forbidden`r`nContent-Length: 9`r`nConnection: close`r`n`r`nForbidden")
                    $stream.Write($msg, 0, $msg.Length)
                    $c.Close()
                    return
                }

                if ([System.IO.File]::Exists($filePath)) {
                    $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                    $contentType = if ($t.ContainsKey($ext)) { $t[$ext] } else { "application/octet-stream" }
                    $bytes = [System.IO.File]::ReadAllBytes($filePath)
                    
                    $headerStr = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
                    $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($headerStr)
                    
                    $stream.Write($headerBytes, 0, $headerBytes.Length)
                    $stream.Write($bytes, 0, $bytes.Length)
                } else {
                    $msg = [System.Text.Encoding]::UTF8.GetBytes("HTTP/1.1 404 Not Found`r`nContent-Length: 9`r`nConnection: close`r`n`r`nNot Found")
                    $stream.Write($msg, 0, $msg.Length)
                }
            } catch {
                # Ignorar desconexiones de cliente
            } finally {
                $c.Close()
            }
        }, $state) | Out-Null
    }
} finally {
    $listener.Stop()
}
