import os
import re
from pathlib import Path
from collections import defaultdict

# Read source files
src_files = set()
with open('/d/sanliurfa.com/sanliurfa/src_files.txt', 'r') as f:
    for line in f:
        line = line.strip()
        if line:
            src_files.add(line.replace("\\", "/"))

# Read test files
test_files = []
with open('/d/sanliurfa.com/sanliurfa/test_files.txt', 'r') as f:
    for line in f:
        line = line.strip()
        if line:
            test_files.append(line.replace("\\", "/"))

# Build mapping from test name patterns
src_to_test = defaultdict(list)
tested_src_files = set()

for test_file in test_files:
    if not os.path.exists(test_file):
        continue
    
    # Read test file content
    try:
        with open(test_file, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
    except:
        continue
    
    # Extract test filename
    test_basename = os.path.basename(test_file)
    
    # Look for import statements
    imports = re.findall(r"from\s+['\"]([^'\"]+)['\"]", content)
    
    for imp in imports:
        # Try variations to match source files
        candidates = []
        
        # Direct match with /index.ts suffix
        if imp.endswith('/index'):
            cand = f"/d/sanliurfa.com/sanliurfa/src/lib{imp}.ts"
            if cand in src_files:
                candidates.append(cand)
        
        # Without suffix
        cand_ts = f"/d/sanliurfa.com/sanliurfa/src/lib{imp}.ts"
        if cand_ts in src_files:
            candidates.append(cand_ts)
        
        # With /index.ts suffix
        cand_idx = f"/d/sanliurfa.com/sanliurfa/src/lib{imp}/index.ts"
        if cand_idx in src_files:
            candidates.append(cand_idx)
        
        # Match relative paths (../)
        if imp.startswith('../'):
            # test is in __tests__, so go up and reconstruct
            parts = imp.split('/')
            up_count = parts.count('..')
            lib_path = imp.replace('../', '').replace('./', '')
            
            cand_ts = f"/d/sanliurfa.com/sanliurfa/src/lib/{lib_path}.ts"
            if cand_ts in src_files:
                candidates.append(cand_ts)
            
            cand_idx = f"/d/sanliurfa.com/sanliurfa/src/lib/{lib_path}/index.ts"
            if cand_idx in src_files:
                candidates.append(cand_idx)
        
        for src in candidates:
            if src not in src_to_test[src]:
                src_to_test[src].append(test_file)
            tested_src_files.add(src)

# Find untested files
untested = sorted(src_files - tested_src_files)

print(f"Total src: {len(src_files)}")
print(f"Tested: {len(tested_src_files)}")
print(f"Untested: {len(untested)}")
print(f"Sample untested: {untested[:10]}")

