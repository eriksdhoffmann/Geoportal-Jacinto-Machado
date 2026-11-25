import json, os, re

tpath = r'C:\Users\Win11\.gemini\antigravity\brain\c9bd30f1-e5cf-4725-abb0-fb1231c11942\.system_generated\logs\transcript.jsonl'
with open(tpath, encoding='utf-8') as f:
    lines = f.readlines()

last = json.loads(lines[-1])
print('=== LAST RESPONSE ===')
print(last.get('content', '')[:3500])

print('\n=== DOWNLOADS FOLDERS ===')
for name in os.listdir(r'C:\Users\Win11\Downloads'):
    if 'araquari' in name.lower() or 'geo' in name.lower():
        print(' ', os.path.join(r'C:\Users\Win11\Downloads', name))
