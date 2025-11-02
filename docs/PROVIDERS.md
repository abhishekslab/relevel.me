# Call Provider Guide

This guide explains how to add and configure call providers for relevel.me's voice call feature.

## Overview

relevel.me uses a **provider abstraction layer** that allows you to swap voice call services without changing business logic. This means you can easily switch between different providers or add support for new ones.

## Supported Providers

### Built-in Providers

| Provider | Status | Use Case |
|----------|--------|----------|
| **CallKaro** | ✅ Production Ready | Indian market, affordable rates |
| **Vapi** | 🚧 Stub Implementation | Alternative provider, good API |

### Coming Soon

- Twilio
- Bland AI
- Custom providers

## Quick Start

### Using CallKaro

1. Sign up at [callkaro.ai](https://callkaro.ai)
2. Get your API key from the dashboard
3. Create an agent
4. Configure environment variables:

```bash
# .env
CALL_PROVIDER=callkaro
CALLKARO_API_KEY=your_api_key_here
CALLKARO_BASE_URL=https://api.callkaro.ai
CALLKARO_AGENT_ID=your_agent_id
CALLKARO_WEBHOOK_SECRET=your_webhook_secret
```

5. Set webhook URL in CallKaro dashboard: `https://yourdomain.com/api/webhooks/call`

### Using Vapi

1. Sign up at [vapi.ai](https://vapi.ai)
2. Get your API key
3. Create an assistant
4. Configure environment variables:

```bash
# .env
CALL_PROVIDER=vapi
VAPI_API_KEY=your_api_key_here
VAPI_BASE_URL=https://api.vapi.ai
VAPI_ASSISTANT_ID=your_assistant_id
VAPI_WEBHOOK_SECRET=your_webhook_secret
```

5. Set webhook URL in Vapi dashboard: `https://yourdomain.com/api/webhooks/call`

## Provider Comparison

| Feature | CallKaro | Vapi | Twilio |
|---------|----------|------|--------|
| **Pricing** | ₹/min | $/min | $/min |
| **Languages** | 12+ | 100+ | 100+ |
| **Latency** | Low | Low | Low |
| **Indian Numbers** | ✅ Excellent | ⚠️ Limited | ✅ Good |
| **US Numbers** | ⚠️ Limited | ✅ Excellent | ✅ Excellent |
| **Setup Difficulty** | Easy | Easy | Moderate |
| **Documentation** | Good | Excellent | Excellent |
| **Free Tier** | ✅ | ✅ | ✅ Limited |

## Architecture

### Provider Interface

All call providers must implement the `CallProvider` interface:

```typescript
// lib/providers/call-provider.ts

export interface CallProvider {
  // Initiate an outbound call
  initiateCall(request: InitiateCallRequest): Promise<InitiateCallResponse>;

  // Parse webhook payload to standard format
  parseWebhook(rawPayload: any): CallWebhookPayload;

  // Optional: Verify webhook signature
  verifyWebhookSignature?(payload: string, signature: string): boolean;

  // Provider metadata
  readonly name: string;
  readonly requiresAgentId: boolean;
}
```

### Data Flow

```
┌─────────────┐     1. Initiate Call     ┌──────────────┐
│   App/API   │ ───────────────────────> │   Provider   │
│             │                           │   (Factory)  │
└─────────────┘                           └──────────────┘
                                                 │
                                                 │ 2. API Call
                                                 v
                                          ┌──────────────┐
                                          │  Call Vendor │
                                          │ (CallKaro/   │
                                          │   Vapi)      │
                                          └──────────────┘
                                                 │
                                                 │ 3. Webhook
                                                 v
┌─────────────┐     4. Update Status    ┌──────────────┐
│  Database   │ <───────────────────────│   Webhook    │
│  (Supabase) │                         │   Handler    │
└─────────────┘                         └──────────────┘
```

## Adding a New Provider

### Step 1: Create Provider Implementation

Create `lib/providers/implementations/yourprovider-provider.ts`:

```typescript
import {
  CallProvider,
  InitiateCallRequest,
  InitiateCallResponse,
  CallWebhookPayload,
} from '../call-provider';

export class YourProviderProvider implements CallProvider {
  readonly name = 'YourProvider';
  readonly requiresAgentId = true; // or false

  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.YOURPROVIDER_BASE_URL || 'https://api.yourprovider.com';
    this.apiKey = process.env.YOURPROVIDER_API_KEY || '';

    if (!this.apiKey) {
      console.warn('[YourProvider] API key not set');
    }
  }

  async initiateCall(request: InitiateCallRequest): Promise<InitiateCallResponse> {
    try {
      // Make API call to your provider
      const response = await fetch(`${this.baseUrl}/calls`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: request.toNumber,
          agent: request.agentId,
          metadata: request.metadata,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const data = await response.json();

      return {
        success: true,
        vendorCallId: data.id,
        callId: request.metadata.call_id,
        status: data.status,
        message: 'Call initiated',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  parseWebhook(rawPayload: any): CallWebhookPayload {
    // Map your provider's webhook format to our standard format
    return {
      vendorCallId: rawPayload.id,
      status: this.mapStatus(rawPayload.status),
      metadata: rawPayload.metadata,
      transcript: rawPayload.transcript,
      recordingUrl: rawPayload.recording_url,
      duration: rawPayload.duration,
      timestamp: rawPayload.created_at,
    };
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    // Implement webhook signature verification
    // This prevents unauthorized requests to your webhook endpoint
    const secret = process.env.YOURPROVIDER_WEBHOOK_SECRET;
    if (!secret) return true; // Skip verification if no secret

    // Example using HMAC SHA256:
    // const crypto = require('crypto');
    // const hmac = crypto.createHmac('sha256', secret);
    // const digest = hmac.update(payload).digest('hex');
    // return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));

    return true;
  }

  private mapStatus(vendorStatus: string): CallWebhookPayload['status'] {
    // Map vendor-specific status to our standard status
    const statusMap: Record<string, CallWebhookPayload['status']> = {
      'initiated': 'ringing',
      'answered': 'in_progress',
      'ended': 'completed',
      'failed': 'failed',
      'busy': 'busy',
      'no-answer': 'no_answer',
    };

    return statusMap[vendorStatus] || 'failed';
  }
}
```

### Step 2: Register in Factory

Update `lib/providers/factory.ts`:

```typescript
import { YourProviderProvider } from './implementations/yourprovider-provider';

export function getCallProvider(): CallProvider {
  const provider = (process.env.CALL_PROVIDER || 'callkaro').toLowerCase();

  switch (provider) {
    case 'callkaro':
      return new CallKaroProvider();
    case 'vapi':
      return new VapiProvider();
    case 'yourprovider':  // Add your provider
      return new YourProviderProvider();
    default:
      console.warn(`Unknown provider "${provider}", using CallKaro`);
      return new CallKaroProvider();
  }
}

// Add validation
export function validateCallProviderConfig(): { valid: boolean; errors: string[] } {
  const provider = (process.env.CALL_PROVIDER || 'callkaro').toLowerCase();
  const errors: string[] = [];

  switch (provider) {
    // ... existing cases ...

    case 'yourprovider':
      if (!process.env.YOURPROVIDER_API_KEY) {
        errors.push('YOURPROVIDER_API_KEY is required');
      }
      break;
  }

  return { valid: errors.length === 0, errors };
}
```

### Step 3: Update Environment Variables

Add to `.env.example`:

```bash
# YourProvider configuration
# YOURPROVIDER_API_KEY=your_api_key
# YOURPROVIDER_BASE_URL=https://api.yourprovider.com
# YOURPROVIDER_AGENT_ID=your_agent_id
# YOURPROVIDER_WEBHOOK_SECRET=your_webhook_secret
```

### Step 4: Test Your Implementation

```bash
# Set environment variables
export CALL_PROVIDER=yourprovider
export YOURPROVIDER_API_KEY=test_key

# Test initiation
npm run dev

# Make a test call through the dashboard
# Check logs for provider activity

# Test webhook
curl -X POST http://localhost:3000/api/webhooks/call \
  -H "Content-Type: application/json" \
  -d '{"id": "test-call-id", "status": "completed"}'
```

### Step 5: Document Your Provider

Add a section to this file with:
- Setup instructions
- Required environment variables
- Pricing information
- Known limitations
- Example configuration

## Environment Variables Reference

### CallKaro

```bash
CALL_PROVIDER=callkaro
CALLKARO_API_KEY=              # Required: Your API key from dashboard
CALLKARO_BASE_URL=             # Optional: Defaults to https://api.callkaro.ai
CALLKARO_AGENT_ID=             # Required: Agent/assistant ID
CALLKARO_WEBHOOK_SECRET=       # Recommended: For webhook security
```

### Vapi

```bash
CALL_PROVIDER=vapi
VAPI_API_KEY=                  # Required: Your API key
VAPI_BASE_URL=                 # Optional: Defaults to https://api.vapi.ai
VAPI_ASSISTANT_ID=             # Required: Assistant ID
VAPI_WEBHOOK_SECRET=           # Recommended: For webhook security
```

## Troubleshooting

### Call Not Initiating

1. **Check provider configuration**:
   ```bash
   echo $CALL_PROVIDER
   echo $CALLKARO_API_KEY  # or VAPI_API_KEY
   ```

2. **Check logs** for provider errors:
   ```bash
   # Look for [CallProvider], [CallKaroProvider], or [VapiProvider] logs
   tail -f logs/app.log
   ```

3. **Verify agent/assistant ID** exists in provider dashboard

4. **Test API directly** using cURL or Postman

### Webhook Not Working

1. **Verify webhook URL** is accessible from internet
   ```bash
   curl https://yourdomain.com/api/webhooks/call
   ```

2. **Check webhook configuration** in provider dashboard

3. **Enable webhook logging** temporarily

4. **Verify signature** if using webhook secret

5. **Check firewall** rules allow inbound webhooks

### Provider Switching

To switch providers:

1. Update `CALL_PROVIDER` environment variable
2. Set new provider's environment variables
3. Restart application
4. Update webhook URL in new provider's dashboard
5. Test with a call

**Note**: Existing calls will reference the old provider's call IDs. Historical data remains unchanged.

## Best Practices

### Security

- ✅ Always use webhook secrets
- ✅ Validate all webhook signatures
- ✅ Use environment variables for secrets
- ✅ Enable HTTPS for webhooks
- ❌ Never commit API keys

### Reliability

- ✅ Implement retry logic for API calls
- ✅ Handle rate limiting gracefully
- ✅ Log all provider interactions
- ✅ Monitor webhook failures
- ✅ Have fallback mechanisms

### Cost Optimization

- Set up billing alerts in provider dashboard
- Monitor call duration and frequency
- Use cheaper providers for development/testing
- Consider region-specific providers
- Implement call queueing during off-peak hours

## FAQ

### Can I use multiple providers simultaneously?

Not currently. The application uses one provider at a time. However, you can switch providers by changing the `CALL_PROVIDER` environment variable.

### Do I need to migrate data when switching providers?

No. Historical call data remains in your database. Only new calls use the new provider.

### What happens to in-progress calls when I switch providers?

Existing calls continue with their original provider. The switch only affects new calls.

### Can I build a custom provider?

Yes! Follow the "Adding a New Provider" guide above. We welcome contributions for new providers.

### Which provider should I choose?

- **For India**: CallKaro (better rates, local numbers)
- **For US/Global**: Vapi (more features, better global coverage)
- **For enterprise**: Consider Twilio (most reliable, highest cost)

## Contributing

To contribute a new provider:

1. Follow the implementation guide above
2. Test thoroughly
3. Update documentation
4. Submit a PR with:
   - Provider implementation
   - Factory registration
   - Environment variable docs
   - Test results
   - Provider comparison update

## Support

- **Provider-specific issues**: Contact provider support
- **Integration issues**: Open a GitHub issue
- **Feature requests**: Start a GitHub discussion
- **Community chat**: [Coming soon]

---

Happy calling! 📞
