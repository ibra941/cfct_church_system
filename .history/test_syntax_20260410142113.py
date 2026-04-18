import ast
import sys

try:
    with open('backend/apps/members/admin.py', 'r') as f:
        code = f.read()
    ast.parse(code)
    print("✓ Syntax is valid")
    sys.exit(0)
except SyntaxError as e:
    print(f"✗ Syntax Error: {e}")
    print(f"  Line {e.lineno}: {e.text}")
    sys.exit(1)
