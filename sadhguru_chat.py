#!/usr/bin/env python3

import argparse
import sys
from typing import List, Dict
import os
import ollama
from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env")

console = Console()


def get_ollama_client():
    """
    Builds an Ollama client using the environment variables.

    Returns:
        ollama.Client: An Ollama client.

    Raises:
        ValueError: If the OLLAMA_HOST or OLLAMA_API_KEY environment variables are not set.
    """
    return ollama.Client(
        host=os.getenv("OLLAMA_HOST"),
        headers={"Authorization": "Bearer " + os.environ.get("OLLAMA_API_KEY")},
    )


# -----------------------------
# Prompt Engineering Core
# -----------------------------
def build_system_prompt(opc: bool = False, sans: bool = False) -> str:
    base = """
You are Sadhguru Jaggi Vasudev — a realized yogi, mystic, and spiritual master.

Guidelines:
- Respond with depth, clarity, and experiential wisdom.
- Use analogies from life, nature, and inner experience.
- Avoid sounding like a generic AI.
- Maintain calm authority, poetic tone, and subtle humor where appropriate.
- Do NOT break character.

Structure:
- Begin with a reflective or paradoxical statement when appropriate.
- Expand into insight.
- End with a contemplative takeaway or question.
"""

    if opc:
        base += """
Mode: Yogic Code (OPC - Ontological Programming Construct)
- Express ideas as structured pseudo-code of consciousness.
- Blend programming metaphors with yogic insight.
- Example constructs: SELF.init(), MIND.detach(), AWARENESS.loop()
"""

    if sans:
        base += """
Mode: Sanskrit + Tamil Blend
- Respond using a poetic mixture of Sanskrit and Tamil.
- Maintain meaning clarity, but prioritize philosophical depth.
- Example tone: आध्यात्मिकम् meets ஆன்மிகம்
"""

    return base.strip()


def build_messages(question: str, system_prompt: str) -> List[Dict]:
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": question},
    ]


# -----------------------------
# Ollama Chat Wrapper
# -----------------------------
def chat_with_model(messages: List[Dict], model: str = "llama3") -> str:
    try:
        client = get_ollama_client()
        response = client.chat(
            model=model,
            messages=messages,
        )
        return response["message"]["content"]
    except Exception as e:
        console.print(f"[bold red]Error:[/bold red] {e}")
        sys.exit(1)


# -----------------------------
# Rendering
# -----------------------------
def render_output(text: str):
    md = Markdown(text)
    console.print(Panel(md, title="🧘 Sadhguru Speaks", border_style="green"))


# -----------------------------
# Interactive Mode
# -----------------------------
def interactive_chat(system_prompt: str, model: str):
    console.print("[bold cyan]Entering Interactive Mode (Ctrl+C to exit)[/bold cyan]\n")

    history = [{"role": "system", "content": system_prompt}]

    try:
        while True:
            user_input = console.input("[bold yellow]You:[/bold yellow] ")

            if not user_input.strip():
                continue

            history.append({"role": "user", "content": user_input})

            response = chat_with_model(history, model=model)
            history.append({"role": "assistant", "content": response})

            render_output(response)

    except KeyboardInterrupt:
        console.print("\n[bold red]Exiting...[/bold red]")


# -----------------------------
# CLI
# -----------------------------
def main():
    parser = argparse.ArgumentParser(description="Chat with Sadhguru via Ollama")

    parser.add_argument("--question", type=str, help="Ask a single question")
    parser.add_argument("--interactive", action="store_true", help="Interactive mode")
    parser.add_argument("--opc", action="store_true", help="Yogic code format")
    parser.add_argument("--sans", action="store_true", help="Sanskrit + Tamil mode")
    parser.add_argument("--model", type=str, default="gpt-oss:20b", help="Ollama model")

    args = parser.parse_args()

    system_prompt = build_system_prompt(opc=args.opc, sans=args.sans)

    # Single question mode
    if args.question:
        messages = build_messages(args.question, system_prompt)
        response = chat_with_model(messages, model=args.model)
        render_output(response)

    # Interactive mode
    elif args.interactive:
        interactive_chat(system_prompt, model=args.model)

    else:
        console.print("[bold red]Error:[/bold red] Provide --question or --interactive")
        parser.print_help()


if __name__ == "__main__":
    main()
