using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Collections.Generic;

class SimpleServer
{
    static int port = 8080;
    static string rootDir;
    static Dictionary<string, string> mimeTypes = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        { ".html", "text/html; charset=utf-8" },
        { ".css",  "text/css; charset=utf-8" },
        { ".js",   "application/javascript; charset=utf-8" },
        { ".json", "application/json; charset=utf-8" },
        { ".svg",  "image/svg+xml" },
        { ".png",  "image/png" },
        { ".jpg",  "image/jpeg" },
        { ".jpeg", "image/jpeg" },
        { ".ico",  "image/x-icon" }
    };

    static void Main(string[] args)
    {
        int p;
        if (args.Length > 0 && int.TryParse(args[0], out p)) port = p;
        rootDir = AppDomain.CurrentDomain.BaseDirectory;

        TcpListener listener = null;
        try
        {
            listener = new TcpListener(IPAddress.Any, port);
            listener.Start();
        }
        catch
        {
            port = 8081;
            listener = new TcpListener(IPAddress.Any, port);
            listener.Start();
        }

        string localIp = "127.0.0.1";
        try
        {
            var host = Dns.GetHostEntry(Dns.GetHostName());
            foreach (var ip in host.AddressList)
            {
                if (ip.AddressFamily == AddressFamily.InterNetwork && !ip.ToString().StartsWith("127.") && !ip.ToString().StartsWith("169.254."))
                {
                    localIp = ip.ToString();
                    break;
                }
            }
        }
        catch { }

        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("=========================================================");
        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine("   SISTEMA DE CONTROL DE VALLAS PUBLICITARIAS - PWA     ");
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("=========================================================");
        Console.ResetColor();
        Console.WriteLine();
        Console.WriteLine("-> En tu COMPUTADORA:  http://localhost:" + port);
        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.WriteLine("-> En tu CELULAR (Wi-Fi): http://" + localIp + ":" + port);
        Console.ResetColor();
        Console.WriteLine();
        Console.WriteLine("Presiona Ctrl + C para detener el servidor.");
        Console.WriteLine("=========================================================");

        while (true)
        {
            try
            {
                TcpClient client = listener.AcceptTcpClient();
                ThreadPool.QueueUserWorkItem(HandleClient, client);
            }
            catch (Exception)
            {
                break;
            }
        }
    }

    static void HandleClient(object state)
    {
        TcpClient client = (TcpClient)state;
        try
        {
            client.ReceiveTimeout = 5000;
            client.SendTimeout = 5000;
            using (NetworkStream stream = client.GetStream())
            using (StreamReader reader = new StreamReader(stream, Encoding.UTF8))
            {
                string requestLine = reader.ReadLine();
                if (string.IsNullOrEmpty(requestLine)) return;

                string[] tokens = requestLine.Split(' ');
                if (tokens.Length < 2) return;

                string urlPath = tokens[1].Split('?')[0].TrimStart('/');
                if (string.IsNullOrEmpty(urlPath) || urlPath == "/")
                {
                    urlPath = "index.html";
                }

                string fullPath = Path.GetFullPath(Path.Combine(rootDir, urlPath));
                if (!fullPath.StartsWith(rootDir, StringComparison.OrdinalIgnoreCase))
                {
                    byte[] forbidden = Encoding.UTF8.GetBytes("HTTP/1.1 403 Forbidden\r\nContent-Length: 9\r\nConnection: close\r\n\r\nForbidden");
                    stream.Write(forbidden, 0, forbidden.Length);
                    return;
                }

                if (File.Exists(fullPath))
                {
                    string ext = Path.GetExtension(fullPath);
                    string contentType;
                    if (!mimeTypes.TryGetValue(ext, out contentType))
                    {
                        contentType = "application/octet-stream";
                    }

                    byte[] fileBytes = File.ReadAllBytes(fullPath);
                    string headers = "HTTP/1.1 200 OK\r\n" +
                                     "Content-Type: " + contentType + "\r\n" +
                                     "Content-Length: " + fileBytes.Length + "\r\n" +
                                     "Access-Control-Allow-Origin: *\r\n" +
                                     "Connection: close\r\n\r\n";
                    byte[] headerBytes = Encoding.UTF8.GetBytes(headers);
                    stream.Write(headerBytes, 0, headerBytes.Length);
                    stream.Write(fileBytes, 0, fileBytes.Length);
                }
                else
                {
                    byte[] notFound = Encoding.UTF8.GetBytes("HTTP/1.1 404 Not Found\r\nContent-Length: 9\r\nConnection: close\r\n\r\nNot Found");
                    stream.Write(notFound, 0, notFound.Length);
                }
            }
        }
        catch { }
        finally
        {
            try { client.Close(); } catch { }
        }
    }
}
