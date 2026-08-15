import time
import httpx

BASE_URL = "http://localhost:8000/api/v1"

def run_live_e2e_demo():
    print("=== STARTING LIVE END-TO-END DEMO ===")
    
    # 1. Register / Login User
    email = f"live-demo-{int(time.time())}@swarm.ai"
    password = "password123"
    
    print(f"\n1. Registering User: {email}")
    r = httpx.post(f"{BASE_URL}/auth/register", json={"email": email, "password": password})
    print(f"Register Status: {r.status_code}, User ID: {r.json().get('id')}")
    
    print(f"\n2. Logging In...")
    r = httpx.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    token = r.json().get("access_token")
    print(f"Login Status: {r.status_code}, Token Acquired: {token[:20]}...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Submit Research Job
    topic = "Impact of Generative AI on Software Development Productivity"
    print(f"\n3. Submitting Research Job: '{topic}'")
    r = httpx.post(f"{BASE_URL}/research", json={"topic": topic}, headers=headers)
    print(f"Job Submission Status: {r.status_code}")
    job_data = r.json()
    job_id = job_data["id"]
    print(f"Job ID: {job_id}, Initial Status: {job_data['status']}")
    
    # 4. Poll Job Status & Live Event Logs
    print(f"\n4. Polling Job Status & Swarm Event Stream...")
    last_event_count = 0
    max_polls = 120  # Poll up to 2 minutes
    
    for i in range(max_polls):
        time.sleep(2)
        r = httpx.get(f"{BASE_URL}/research/{job_id}", headers=headers)
        if r.status_code != 200:
            print(f"Status poll failed ({r.status_code}): {r.text}")
            continue
            
        status_data = r.json()
        current_status = status_data["status"]
        events = status_data.get("events", [])
        
        # Print new events
        if len(events) > last_event_count:
            for evt in events[last_event_count:]:
                print(f"  [EVENT #{evt.get('event_id')}] [{evt.get('agent') or 'SYSTEM'}] {evt.get('event_type')}: {evt.get('message')}")
            last_event_count = len(events)
            
        print(f"Poll #{i+1}: Status={current_status}, Loop Count={status_data.get('loop_count')}")
        
        if current_status in ["COMPLETED", "COMPLETED_WITH_WARNING", "completed", "completed_with_warning", "FAILED", "failed"]:
            print(f"\nSwarm Execution Reached Final State: {current_status}")
            break
            
    # 5. Fetch Final Report
    print(f"\n5. Fetching Finalized Research Report...")
    r = httpx.get(f"{BASE_URL}/research/{job_id}/report", headers=headers)
    print(f"Report Fetch Status: {r.status_code}")
    if r.status_code == 200:
        report = r.json()
        print(f"\nReport ID: {report.get('id')}")
        print(f"Critic Scores: {report.get('critic_scores')}")
        print(f"Sources Count: {len(report.get('sources', []))}")
        print("\n--- REPORT CONTENT SNIPPET ---")
        print(report.get('content', '')[:600])
        print("...\n--- END OF REPORT SNIPPET ---")
        print("\n=== LIVE END-TO-END DEMO SUCCESSFUL ===")
    else:
        print(f"Report Fetch Error: {r.text}")

if __name__ == "__main__":
    run_live_e2e_demo()
