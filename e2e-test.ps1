$ErrorActionPreference = "Stop"
$apiUrl = "http://localhost:8080/api"

function Log ($msg) {
    Write-Host "[E2E] $msg" -ForegroundColor Cyan
}

function LogSuccess ($msg) {
    Write-Host "[SUCCESS] $msg" -ForegroundColor Green
}

function LogFail ($msg) {
    Write-Host "[FAIL] $msg" -ForegroundColor Red
    throw $msg
}

# STEP 1: Authentication
Log "STEP 1: Authentication for all roles..."
$roles = @(
    @{ user = "carrier"; pass = "carrier123" },
    @{ user = "customer"; pass = "customer123" },
    @{ user = "fmg"; pass = "fmg123" }
)
$tokens = @{}
$userIds = @{}

foreach ($r in $roles) {
    $body = @{ username = $r.user; password = $r.pass } | ConvertTo-Json
    try {
        $res = Invoke-RestMethod -Uri "$apiUrl/auth/login" -Method Post -Body $body -ContentType "application/json"
        $tokens[$r.user] = $res.token
        $userIds[$r.user] = $res.id
        LogSuccess "$($r.user) logged in successfully."
    } catch {
        $msg = $_
        if ($_.Exception.Response) {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $responseBody = $reader.ReadToEnd()
            $msg = "$msg `nResponse Body: $responseBody"
        }
        Write-Host "[FAIL] $msg" -ForegroundColor Red
        throw $msg
    }
}

# STEP 2: Policy Creation (CARRIER)
Log "STEP 2: Policy Creation (CARRIER)"
$policyBody = @{
    policyName = "Test Health Premium"
    policyType = "HEALTH"
    coverageAmount = 500000
    premium = 12000
    validFrom = (Get-Date).ToString("yyyy-MM-dd")
    validTo = (Get-Date).AddYears(1).ToString("yyyy-MM-dd")
    description = "Comprehensive health policy"
} | ConvertTo-Json
try {
    $res = Invoke-RestMethod -Uri "$apiUrl/policies" -Method Post -Body $policyBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $($tokens['carrier'])" }
    $policyId = $res.id
    LogSuccess "Policy created with ID: $policyId"
} catch {
    LogFail "Policy creation failed: $_"
}

# STEP 3: Policy Purchase (CUSTOMER)
Log "STEP 3: Policy Purchase (CUSTOMER)"
try {
    $res = Invoke-RestMethod -Uri "$apiUrl/policies/$policyId/purchase" -Method Post -Headers @{ Authorization = "Bearer $($tokens['customer'])" }
    $customerPolicyId = $res.id
    LogSuccess "Customer purchased policy, CustomerPolicyID: $customerPolicyId (Status: $($res.status))"
} catch {
    LogFail "Policy purchase failed: $_"
}

# STEP 4: Claim Submission
Log "STEP 4: Claim Submission (CUSTOMER)"
try {
    $claimFormPath = "c:\Final-Project\backend\dummy_docs\Dummy_Claim_Form.pdf"
    $combinedDocPath = "c:\Final-Project\backend\dummy_docs\Dummy_Combined_Doc.pdf"

    # Use multipart/form-data
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    
    $fileBytes1 = [System.IO.File]::ReadAllBytes($claimFormPath)
    $fileBytes2 = [System.IO.File]::ReadAllBytes($combinedDocPath)
    
    $bodyBytes = [System.Collections.Generic.List[byte]]::new()
    
    $stringPart = "--$boundary$LF" +
                  "Content-Disposition: form-data; name=`"customerPolicyId`"$LF$LF" +
                  "$customerPolicyId$LF" +
                  "--$boundary$LF" +
                  "Content-Disposition: form-data; name=`"claimForm`"; filename=`"Dummy_Claim_Form.pdf`"$LF" +
                  "Content-Type: application/pdf$LF$LF"
    $bodyBytes.AddRange([System.Text.Encoding]::UTF8.GetBytes($stringPart))
    $bodyBytes.AddRange($fileBytes1)
    
    $stringPart2 = "$LF--$boundary$LF" +
                   "Content-Disposition: form-data; name=`"combinedDoc`"; filename=`"Dummy_Combined_Doc.pdf`"$LF" +
                   "Content-Type: application/pdf$LF$LF"
    $bodyBytes.AddRange([System.Text.Encoding]::UTF8.GetBytes($stringPart2))
    $bodyBytes.AddRange($fileBytes2)
    
    $endBoundary = "$LF--$boundary--$LF"
    $bodyBytes.AddRange([System.Text.Encoding]::UTF8.GetBytes($endBoundary))
    
    $res = Invoke-RestMethod -Uri "$apiUrl/claims" -Method Post -Body $bodyBytes.ToArray() -ContentType "multipart/form-data; boundary=$boundary" -Headers @{ Authorization = "Bearer $($tokens['customer'])" }
    
    $claimId = $res.id
    LogSuccess "Claim submitted successfully with ID: $claimId. Status: $($res.status)"
} catch {
    LogFail "Claim submission failed: $_"
}

# STEP 5: FMG Processing
Log "STEP 5: FMG Processing"
try {
    $res = Invoke-RestMethod -Uri "$apiUrl/fmg/claims/$claimId/process" -Method Post -Headers @{ Authorization = "Bearer $($tokens['fmg'])" }
    LogSuccess "FMG processing (OCR + Rules + AI) completed. Status: $($res.status)"
} catch {
    $msg = $_
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $responseBody = $reader.ReadToEnd()
        $msg = "$msg `nResponse Body: $responseBody"
    }
    LogFail "FMG Processing failed: $msg"
}

Log "STEP 5b: FMG Final Decision"
try {
    $approveFmgBody = @{ comments = "Verified by AI and rules." } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$apiUrl/fmg/claims/$claimId/approve" -Method Put -Body $approveFmgBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $($tokens['fmg'])" }
    LogSuccess "FMG approved claim. Status: $($res.status)"
} catch {
    LogFail "FMG approval failed: $_"
}

# STEP 6: Carrier Final Decision
Log "STEP 6: Carrier Final Decision"
try {
    $carrierBody = @{ settlementAmount = 45000; remarks = "Payment approved." } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$apiUrl/carrier/claims/$claimId/approve" -Method Put -Body $carrierBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $($tokens['carrier'])" }
    LogSuccess "Carrier approved payment. Status: $($res.status)"
} catch {
    LogFail "Carrier approval failed: $_"
}

# STEP 7: Timeline Validation
Log "STEP 7: Timeline Validation"
try {
    $res = Invoke-RestMethod -Uri "$apiUrl/claims/$claimId/timeline" -Method Get -Headers @{ Authorization = "Bearer $($tokens['customer'])" }
    if ($res.Count -lt 5) {
        LogFail "Timeline entries missing. Expected >= 5, got $($res.Count)"
    }
    LogSuccess "Timeline validation passed. Found $($res.Count) entries."
} catch {
    LogFail "Timeline validation failed: $_"
}

# STEP 8: PDF Generation
Log "STEP 8: PDF Generation"
try {
    $res = Invoke-RestMethod -Uri "$apiUrl/claims/$claimId/export" -Method Get -Headers @{ Authorization = "Bearer $($tokens['customer'])" } -OutFile "c:\Final-Project\test_claim_report.pdf"
    $fileInfo = Get-Item "c:\Final-Project\test_claim_report.pdf"
    if ($fileInfo.Length -eq 0) {
        LogFail "Downloaded PDF is 0 bytes."
    }
    LogSuccess "PDF Generation passed. Saved as test_claim_report.pdf ($($fileInfo.Length) bytes)."
} catch {
    LogFail "PDF Generation failed: $_"
}

LogSuccess "E2E API WORKFLOW COMPLETED SUCCESSFULLY!"
