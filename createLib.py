import os, random

def to_base3(n):
    """Convert n to a 4-digit base-3 string."""
    ternary_digits = []
    while n > 0:
        ternary_digits.append(str(n % 3))
        n //= 3
    ternary_string = "".join(ternary_digits[::-1]) if ternary_digits else "0"
    return ternary_string.zfill(4)

# --- Generate 81 numbers (0000–2222)
nums = [to_base3(i) for i in range(81)]

CARDPATH = "Cards/"
cards = []

# --- Read available card images
try:
    cards = os.listdir(CARDPATH)
except FileNotFoundError:
    print(f"Error: Folder '{CARDPATH}' not found.")
except Exception as e:
    print(f"An error occurred: {e}")

random.shuffle(cards)

FILENAME = "data/library2.js"

# --- Write JS file
with open(FILENAME, "w", encoding="utf-8") as f:
    f.write("const CARD_LIBRARY = [\n")

    for i, push_code in enumerate(nums):
        if i >= len(cards):
            card = "card_not_found.png"
        else:
            card = cards[i]

        name = os.path.splitext(card)[0]

        # Add comma only if not last element
        comma = "," if i < len(nums) - 1 else ""

        f.write(
            f"  {{\n"
            f'    name: "{name}",\n'
            f'    image: "{card}",\n'
            f'    effect: null,\n'
            f'    push: "{push_code}"\n'
            f"  }}{comma}\n"
        )

    f.write("];\n\nexport default CARD_LIBRARY;\n")
