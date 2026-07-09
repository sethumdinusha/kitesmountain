import re

with open('rooms.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Map each room's Book Now / Book button to its room name (URL-encoded)
rooms = [
    ('King Room with Mountain View',  'King+Room+with+Mountain+View'),
    ('Deluxe Double Room',            'Deluxe+Double+Room'),
    ('Budget Double Room',            'Budget+Double+Room'),
    ('Deluxe Triple Room',            'Deluxe+Triple+Room'),
    ('Standard Family Room',          'Standard+Family+Room'),
    ('Basic Triple Room',             'Basic+Triple+Room'),
    ('Family Room with Balcony',      'Family+Room+with+Balcony'),
]

# Replace each room card "Book Now" button - they appear right after each room-detail-card section
# Strategy: find <!-- Room N: ROOM NAME --> comments and the btn-primary Book Now after them,
# but actually let's use a simpler approach: replace contact.html Book Now with contact.html?room=X
# We need to do this per-room by looking at the room heading context.

# Simpler approach: replace in order of rooms as they appear in the file
# Each room section has an h3 with the room name, followed by a btn-primary Book Now

for room_name, room_param in rooms:
    # Pattern: within a section containing the room name h3, replace the btn-primary Book Now
    # Replace btn-primary Book Now that is after this room's h3
    pattern = r'(<h3>' + re.escape(room_name) + r'</h3>.*?<a href="contact\.html" class="btn-primary">Book Now</a>)'
    replacement = lambda m, rp=room_param: m.group(0).replace(
        '<a href="contact.html" class="btn-primary">Book Now</a>',
        f'<a href="contact.html?room={rp}" class="btn-primary">Book Now</a>'
    )
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    # Also fix comparison table btn-sm Book links - find the row with this room name
    table_pattern = r'(<td><strong>' + re.escape(room_name) + r'</strong></td>.*?<a href="contact\.html" class="btn-sm">Book</a>)'
    table_replacement = lambda m, rp=room_param: m.group(0).replace(
        '<a href="contact.html" class="btn-sm">Book</a>',
        f'<a href="contact.html?room={rp}" class="btn-sm">Book</a>'
    )
    content = re.sub(table_pattern, table_replacement, content, flags=re.DOTALL)

with open('rooms.html', 'w', encoding='utf-8') as f:
    f.write(content)

# Verify
for room_name, room_param in rooms:
    count = content.count(f'contact.html?room={room_param}')
    print(f'{room_name}: {count} links updated')

print('\nDone!')
