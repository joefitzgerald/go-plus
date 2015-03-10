$app = Get-WmiObject -Class Win32_Product -Filter "Vendor = 'http://golang.org'"
if ($app) { 
  $app.Uninstall()
}