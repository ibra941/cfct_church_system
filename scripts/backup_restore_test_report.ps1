param(
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432,
    [string]$DbName = "cfct_db",
    [string]$DbUser = "postgres",
    [string]$BackupDir = "./backups",
    [string]$ReportPath = "./docs/BACKUP_RESTORE_TEST_REPORT.md"
)

$ErrorActionPreference = "Stop"

function Run-Query {
    param(
        [string]$Database,
        [string]$Sql
    )

    $cmd = "psql -h $DbHost -p $DbPort -U $DbUser -d $Database -t -A -c `"$Sql`""
    return (Invoke-Expression $cmd).Trim()
}

if (!(Test-Path $BackupDir)) {
    New-Item -Path $BackupDir -ItemType Directory | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $BackupDir "cfct_backup_test_$timestamp.sql"
$restoreDb = "${DbName}_restore_test_$timestamp"

$reportLines = @()
$reportLines += "# Backup + Restore Test Report"
$reportLines += ""
$reportLines += "- Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$reportLines += "- Source DB: $DbName"
$reportLines += "- Restore Test DB: $restoreDb"
$reportLines += ""

try {
    $reportLines += "## Step 1: Backup"
    $dumpCmd = "pg_dump -h $DbHost -p $DbPort -U $DbUser $DbName > `"$backupFile`""
    Invoke-Expression $dumpCmd
    $reportLines += "- Status: PASS"
    $reportLines += "- Backup file: $backupFile"

    $reportLines += ""
    $reportLines += "## Step 2: Restore"
    Invoke-Expression "createdb -h $DbHost -p $DbPort -U $DbUser $restoreDb"
    Invoke-Expression "psql -h $DbHost -p $DbPort -U $DbUser -d $restoreDb -f `"$backupFile`""
    $reportLines += "- Status: PASS"

    $reportLines += ""
    $reportLines += "## Step 3: Data Integrity Spot Check"
    $tablesToCheck = @("users", "churches", "offerings", "notifications")
    foreach ($tbl in $tablesToCheck) {
        $sourceCount = Run-Query -Database $DbName -Sql "SELECT COUNT(*) FROM $tbl;"
        $restoreCount = Run-Query -Database $restoreDb -Sql "SELECT COUNT(*) FROM $tbl;"
        $status = if ($sourceCount -eq $restoreCount) { "PASS" } else { "FAIL" }
        $reportLines += "- Table $tbl: $status (source=$sourceCount, restored=$restoreCount)"
    }

    $reportLines += ""
    $reportLines += "## Step 4: Cleanup"
    Invoke-Expression "dropdb -h $DbHost -p $DbPort -U $DbUser $restoreDb"
    $reportLines += "- Status: PASS"
}
catch {
    $reportLines += ""
    $reportLines += "## Error"
    $reportLines += "- Status: FAIL"
    $reportLines += "- Message: $($_.Exception.Message)"

    try {
        Invoke-Expression "dropdb -h $DbHost -p $DbPort -U $DbUser --if-exists $restoreDb"
    }
    catch {
        # ignore cleanup failure
    }
}

$reportLines | Out-File -FilePath $ReportPath -Encoding utf8
Write-Host "Backup/restore test report written to $ReportPath"
