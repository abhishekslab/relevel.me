"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCallProvider = getCallProvider;
exports.validateCallProviderConfig = validateCallProviderConfig;
const callkaro_provider_1 = require("./implementations/callkaro-provider");
const vapi_provider_1 = require("./implementations/vapi-provider");
/**
 * Get the configured call provider instance
 *
 * The provider is determined by the CALL_PROVIDER environment variable.
 * Supported values: 'callkaro', 'vapi'
 * Default: 'callkaro'
 */
function getCallProvider() {
    const provider = (process.env.CALL_PROVIDER || 'callkaro').toLowerCase();
    switch (provider) {
        case 'callkaro':
            return new callkaro_provider_1.CallKaroProvider();
        case 'vapi':
            return new vapi_provider_1.VapiProvider();
        default:
            console.warn(`[CallProviderFactory] Unknown call provider "${provider}", falling back to CallKaro`);
            return new callkaro_provider_1.CallKaroProvider();
    }
}
/**
 * Validate that required environment variables are set for the configured provider
 */
function validateCallProviderConfig() {
    const provider = (process.env.CALL_PROVIDER || 'callkaro').toLowerCase();
    const errors = [];
    switch (provider) {
        case 'callkaro':
            if (!process.env.CALLKARO_API_KEY) {
                errors.push('CALLKARO_API_KEY is required when using CallKaro provider');
            }
            if (!process.env.CALLKARO_AGENT_ID) {
                errors.push('CALLKARO_AGENT_ID is required when using CallKaro provider');
            }
            break;
        case 'vapi':
            if (!process.env.VAPI_API_KEY) {
                errors.push('VAPI_API_KEY is required when using Vapi provider');
            }
            if (!process.env.VAPI_ASSISTANT_ID) {
                errors.push('VAPI_ASSISTANT_ID is required when using Vapi provider');
            }
            break;
        default:
            errors.push(`Unknown call provider: ${provider}. Supported: callkaro, vapi`);
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
