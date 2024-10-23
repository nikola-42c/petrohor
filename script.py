import csv

def find_timestamp_for_verified_contracts(file_path, target=50000):
    cumulative_sum = 0
    result_timestamp = None
    
    # Read the CSV file in reverse order (starting from the last row)
    with open(file_path, mode='r') as file:
        reader = csv.DictReader(file)
        rows = list(reader)
        
        # Loop from the last row to the first row
        for row in reversed(rows):
            num_contracts = int(row["No. of Verified Contracts"])
            cumulative_sum += num_contracts
            
            # Check if the cumulative sum has reached or exceeded the target
            if cumulative_sum >= target:
                result_timestamp = row["UnixTimeStamp"]
                break
    
    if result_timestamp:
        return (result_timestamp, cumulative_sum)
    else:
        return "The total number of contracts did not reach the target."

# Example usage
file_path = 'export-verified-contracts.csv'
timestamp, sum = find_timestamp_for_verified_contracts(file_path)
print(f"The Unix timestamp when the total contracts reached {sum} or more is: {timestamp}")
