import os
import openai
import sys

def summarize_notes(api_key, notes):
    openai.api_key = api_key
    try:
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Take the following raw changelog and rewrite it into a friendly, user-focused release note. Prioritize clarity over technical detail. Group related changes under headings like New Features, Improvements, Fixes, and Behind the Scenes. Summarize technical work in plain language or omit it if it's not directly relevant to the end user. Assume the audience is someone who uses the Discord bot, not someone maintaining it. Add emojis to help visually break up sections. Use a casual, helpful tone, as if explaining to a Discord server admin or end user."},
                {"role": "user", "content": f"Summarize the following release notes:\n\n{notes}"}
            ]
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error summarizing release notes: {e}", file=sys.stderr)
        return notes

if __name__ == "__main__":
    openai_key = os.getenv("OPENAI_API_KEY")
    release_notes = os.getenv("RELEASE_NOTES")

    if not openai_key:
        print("OPENAI_API_KEY not found.", file=sys.stderr)
        sys.exit(1)

    if not release_notes:
        print("RELEASE_NOTES not found.", file=sys.stderr)
        sys.exit(1)

    summary = summarize_notes(openai_key, release_notes)
    print(summary)

