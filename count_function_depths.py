import json
from collections import Counter

# Path to your input JSON file
input_file = "depths.json"

# Load JSON array from file
with open(input_file, "r") as f:
    data = json.load(f)

# Dictionary to store the maximum depth per file
contract_max_depth = {}

for item in data:
    file = item.get("file")
    contract = item.get("contract")
    dict_key = file + contract
    depth = item.get("expanded_max_depth")
    if dict_key is not None and depth is not None:
        # keep the maximum depth per file
        if dict_key not in contract_max_depth:
            contract_max_depth[dict_key] = depth
        else:
            contract_max_depth[dict_key] = max(contract_max_depth[dict_key], depth)

# Count how many files have the same max depth
depth_counts = Counter(contract_max_depth.values())

# Sort by depth descending
sorted_depth_counts = sorted(depth_counts.items(), key=lambda x: x[0], reverse=True)

# Save results to a txt file
output_file = "depth_counts.txt"
with open(output_file, "w") as f:
    for depth, count in sorted_depth_counts:
        f.write(f"Depth {depth}: {count} files\n")

print(f"Results saved to {output_file}")
