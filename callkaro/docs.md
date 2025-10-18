
API Documentation
📞 Outbound Call API Endpoint
POST https://api.callkaro.ai/call/outbound

🔐 Authentication
This endpoint requires an API key.

Header:

X-API-KEY: your_api_key_here
You can obtain your API key from your Dashboard.

📄 Request Body

{
  "to_number": "+919876543210",
  "agent_id": "6803fa770b65876868ddf",
  "metadata": {
    "key1": "Value 1",
    "key2": 5,
    "city": "Bangalore"
  },
  "schedule_at": "2025-05-28T09:30:00",
  "min_trigger_time": "08:30",
  "max_trigger_time": "20:30",
  "carry_over": true,
  "number_of_retries": 3,
  "gap_between_retries": [30, 120],
  "priority": 0
}
🔹 Fields
Field	Type	Required	Description
to_number	string	✅ Yes	The customer's phone number in international format.
agent_id	string	✅ Yes	ID of the agent handling the call.
batch_id	string	❌ No	ID of the campaign (batch call).
metadata	object	❌ No	Customer metadata accessible in prompts.
schedule_at	string	❌ No	Scheduled call time in ISO format.
min_trigger_time	string	❌ No	Start limit of the day for call.
max_trigger_time	string	❌ No	End limit of the day for call.
carry_over	boolean	❌ No	Whether to schedule call to the next day at min_trigger_time, if max_trigger_time is reached.
number_of_retries	integer	❌ No	Retries if user doesn’t pick up.
gap_between_retries	integer/array of integers	❌ No	Minutes between each retries. For varying retry intervals, provide an array of integers.
priority	integer	❌ No	Priority of the call [-100,100].
✅ Success Response
HTTP 200 OK
{
  "status": "success",
  "message": "Call initiated successfully",
  "call_id": "a1b2c3d4e5"
}
❌ Error Responses
400 - {"status": "error", "message": "Missing agent_id"}
403 - {"status": "error", "message": "Missing X-API-KEY in headers"}
404 - {"status": "error", "message": "Agent does not exist"}
500 - {"status": "error", "message": "Server error"}
🧪 Example cURL Requests
normal:


curl -X POST https://api.callkaro.ai/call/outbound     -H "Content-Type: application/json"     -H "X-API-KEY: your_api_key_here"     -d '{
      "to_number": "+919876543210",
      "agent_id": "6803fa770b666a64ab1694c1e",
      "metadata": {
        "name": "Abhinav",
        "age": 25,
        "city": "Bangalore"
      },
      "priority": 1
    }'
normal call with retry:


curl -X POST https://api.callkaro.ai/call/outbound     -H "Content-Type: application/json"     -H "X-API-KEY: your_api_key_here"     -d '{
      "to_number": "+919876543210",
      "agent_id": "6803fa770b666a64ab1694c1e",
      "metadata": {
        "name": "Abhinav",
        "age": 25,
        "city": "Bangalore"
      },
      "number_of_retries": 3,
      "gap_between_retries": [30, 60]
    }'
scheduling call with no retry:


curl -X POST https://api.callkaro.ai/call/outbound     -H "Content-Type: application/json"     -H "X-API-KEY: your_api_key_here"     -d '{
      "to_number": "+919876543210",
      "agent_id": "6803fa770b666a64ab1694c1e",
      "metadata": {
        "name": "Abhinav",
        "age": 25,
        "city": "Bangalore"
      },
      "schedule_at": "2025-05-28T09:30:00"
    }'
scheduling with retry:


curl -X POST https://api.callkaro.ai/call/outbound     -H "Content-Type: application/json"     -H "X-API-KEY: your_api_key_here"     -d '{
      "to_number": "+919876543210",
      "agent_id": "6803fa770b666a64ab1694c1e",
      "metadata": {
        "name": "Abhinav",
        "age": 25,
        "city": "Bangalore"
      },
      "schedule_at": "2025-05-28T09:30:00",
      "number_of_retries": 3,
      "gap_between_retries": 30
    }'
scheduling with retry and start/end time:


curl -X POST https://api.callkaro.ai/call/outbound     -H "Content-Type: application/json"     -H "X-API-KEY: your_api_key_here"     -d '{
      "to_number": "+919876543210",
      "agent_id": "6803fa770b666a64ab1694c1e",
      "metadata": {
        "name": "Abhinav",
        "age": 25,
        "city": "Bangalore"
      },
      "schedule_at": "2025-05-28T09:30:00",
      "min_trigger_time": "08:30",
      "max_trigger_time": "20:30",
      "number_of_retries": 3,
      "gap_between_retries": 30
    }'
rescheduling to next day:


curl -X POST https://api.callkaro.ai/call/outbound     -H "Content-Type: application/json"     -H "X-API-KEY: your_api_key_here"     -d '{
      "to_number": "+919876543210",
      "agent_id": "6803fa770b666a64ab1694c1e",
      "metadata": {
        "name": "Abhinav",
        "age": 25,
        "city": "Bangalore"
      },
      "schedule_at": "2025-05-28T09:30:00",
      "min_trigger_time": "08:30",
      "max_trigger_time": "20:30",
      "carry_over": true,
      "number_of_retries": 3,
      "gap_between_retries": 30
    }'


📞 Campaign (Batch Call) API Endpoint
POST https://api.callkaro.ai/call/campaign

🔐 Authentication
This endpoint requires an API key.

Header:

X-API-KEY: your_api_key_here
You can obtain your API key from your Dashboard.

📄 Request Body for creating campaign

{
    "name": "Inspection Campaign",
    "agent_id": "6803fa770b65876868ddf"
}
✅ Success Response
HTTP 200 OK
{
    "batch_id": "68433b7b0dee98e59245ebab",
    "message": "Campaign created successfully",
    "status": "success"
}
📄 Request Body for scheduling campaign

{
  "to_number": "+919876543210",
  "batch_id": "68433b7b0dee98e59245ebab",
  "metadata": {
    "key1": "Value 1",
    "key2": 5,
    "city": "Bangalore"
  },
  "schedule_at": "2025-05-28T09:30:00",
  "min_trigger_time": "08:30",
  "max_trigger_time": "20:30",
  "carry_over": true,
  "number_of_retries": 3,
  "gap_between_retries": 30
}
🧪 Example cURL Requests
campaign:


curl -X POST https://api.callkaro.ai/call/campaign     -H "Content-Type: application/json"     -H "X-API-KEY: your_api_key_here"     -d '{
      "name": "Inspection Campaign",
      "agent_id": "6803fa770b65876868ddf"
    }'
schedule campaign:


curl -X POST https://api.callkaro.ai/call/outbound     -H "Content-Type: application/json"     -H "X-API-KEY: your_api_key_here" '{
    "to_number": "+919876543210",
    "batch_id": "68433b7b0dee98e59245ebab",
    "metadata": {
      "key1": "Value 1",
      "key2": 5,
      "city": "Bangalore"
    },
    "schedule_at": "2025-05-28T09:30:00",
    "min_trigger_time": "08:30",
    "max_trigger_time": "20:30",
    "carry_over": true,
    "number_of_retries": 3,
    "gap_between_retries": 30
  }'