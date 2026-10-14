Fix the Python syntax error preventing the backend from starting.

Error:
`backend/app/services/openrouter_client.py`, line 233:
`elif tier == 2:`
`SyntaxError: invalid syntax`

Instructions:
1. Inspect the complete surrounding function in `openrouter_client.py`, especially the code immediately before line 233.
2. Identify the actual syntax or indentation issue; do not blindly change the `elif` to `if`.
3. Make the smallest correct fix while preserving Tier 1 → Tier 2 → Tier 3 fallback behavior, circuit breakers, caching, and response format.
4. Run `python -m py_compile app/services/openrouter_client.py` from the backend directory.
5. Run the relevant backend tests using the project's configured environment.
6. Verify that `app.main` imports successfully.
7. Report the exact changes and actual command results. Do not claim success unless the commands pass.

Do not modify unrelated files.