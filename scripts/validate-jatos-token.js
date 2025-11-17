#!/usr/bin/env node
/**
 * Validates JATOS token by calling /jatos/api/v1/admin/token
 *
 * This script:
 * 1. Checks if JATOS_TOKEN environment variable is set
 * 2. Validates the token by calling JATOS API
 * 3. Provides clear instructions if token is missing or invalid
 */

const JATOS_BASE = process.env.JATOS_BASE || "http://jatos:9000"
const JATOS_TOKEN = process.env.JATOS_TOKEN

async function waitForJatos(maxAttempts = 30) {
  console.log("⏳ Waiting for JATOS to be ready...")

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${JATOS_BASE}/jatos`, {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      })

      if (response.ok) {
        console.log("✅ JATOS is ready!")
        return true
      }
    } catch (error) {
      // Not ready yet, continue waiting
    }

    if (i < maxAttempts - 1) {
      process.stdout.write(".")
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }

  console.log("\n❌ JATOS did not become ready in time")
  return false
}

async function validateToken() {
  // Check if token is set
  if (!JATOS_TOKEN) {
    console.log("\n❌ JATOS_TOKEN environment variable is not set\n")
    printTokenInstructions()
    process.exit(1)
  }

  // Wait for JATOS to be ready
  const isReady = await waitForJatos()
  if (!isReady) {
    process.exit(1)
  }

  console.log("🔍 Validating JATOS token...")

  try {
    const response = await fetch(`${JATOS_BASE}/jatos/api/v1/admin/token`, {
      headers: {
        Authorization: `Bearer ${JATOS_TOKEN}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    })

    if (response.ok) {
      const tokenInfo = await response.json()
      console.log("✅ JATOS token is valid!")
      console.log(`   User: ${tokenInfo.username || tokenInfo.user?.username || "N/A"}`)
      if (tokenInfo.expiresAt) {
        console.log(`   Expires: ${tokenInfo.expiresAt}`)
      } else {
        console.log(`   Expires: Never`)
      }
      return true
    } else {
      const errorText = await response.text()
      console.log(`\n❌ Token validation failed (${response.status})`)
      console.log(`   Error: ${errorText}\n`)
      printTokenInstructions()
      process.exit(1)
    }
  } catch (error) {
    console.log(`\n❌ Error validating token: ${error.message}`)
    console.log(`   This might indicate a network issue or JATOS is not accessible\n`)
    printTokenInstructions()
    process.exit(1)
  }
}

function printTokenInstructions() {
  console.log("📝 To create a JATOS API token:")
  console.log("")
  console.log("   1. Start the Docker services:")
  console.log("      make dev")
  console.log("")
  console.log("   2. Open JATOS UI in your browser:")
  console.log("      http://jatos.localhost")
  console.log("      (or http://localhost if JATOS_DOMAIN is set differently)")
  console.log("")
  console.log("   3. Login with default credentials:")
  console.log("      Username: admin")
  console.log("      Password: admin")
  console.log("")
  console.log("   4. Navigate to your user profile:")
  console.log("      Click your username in the top-right corner")
  console.log("")
  console.log('   5. Go to "My API tokens" or "API Tokens"')
  console.log("")
  console.log('   6. Click "New Token" or "Create Token"')
  console.log("")
  console.log('   7. Provide a name (e.g., "docker-token") and set expiration')
  console.log("")
  console.log('   8. Click "Generate" and copy the token')
  console.log("")
  console.log("   9. Add the token to your .env file:")
  console.log("      JATOS_TOKEN=your-token-here")
  console.log("")
  console.log("   10. Restart the services:")
  console.log("       make stop")
  console.log("       make dev")
  console.log("")
  console.log("   Alternatively, you can set it when starting:")
  console.log("       JATOS_TOKEN=your-token-here make dev")
  console.log("")
}

// Run validation
validateToken().catch((error) => {
  console.error("Unexpected error:", error)
  process.exit(1)
})
