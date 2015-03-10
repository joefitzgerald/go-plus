$app = Get-WmiObject -Class Win32_Product -Filter "Vendor = 'http://golang.org'"
$app.Uninstall()