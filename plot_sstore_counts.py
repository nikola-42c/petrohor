import matplotlib.pyplot as plt
import re  # Import regular expression module

# Function to read the data from the file and extract SSTORE counts and contract numbers
def read_sstore_data(file_path):
    sstore_counts = []
    contract_counts = []

    # Regular expression to match the desired line format
    pattern = re.compile(r"^(\d+) SSTOREs found in (\d+) contracts\.$")

    with open(file_path, 'r') as file:
        for line in file:
            # Use regex to check if the line matches the expected format
            match = pattern.match(line.strip())
            if match:
                sstore_count = int(match.group(1))  # First captured group
                contract_count = int(match.group(2))  # Second captured group
                sstore_counts.append(sstore_count)
                contract_counts.append(contract_count)

    return sstore_counts, contract_counts

# Function to plot the SSTORE counts
def plot_sstore_counts(sstore_counts, contract_counts):
    plt.figure(figsize=(12, 8))
    plt.bar(sstore_counts, contract_counts, color='skyblue', label='Contracts')

    # Set Y and X axis labels
    plt.xlabel('Number of SSTOREs')
    plt.ylabel('Contract count')

    # Set the ticks to show only the corresponding counts
    plt.xticks(sstore_counts, [str(count) for count in sstore_counts])
    
    # Spread the X-axis
    plt.xticks(range(min(sstore_counts), max(sstore_counts) + 2, 1))  # Increase the step for wider spread

    # Display the count of contracts on the plot
    for i, count in enumerate(contract_counts):
        plt.text(sstore_counts[i], count + 1, f'{count}', ha='center')

    plt.title('Contracts per Number of SSTOREs')
    plt.grid(axis='y')
    plt.ylim(bottom=0)  # Ensure y-axis starts at 0
    plt.tight_layout()
    plt.show()

# Main function to execute the script
def main():
    file_path = 'temp.txt'  # Path to your input file
    sstore_counts, contract_counts = read_sstore_data(file_path)
    plot_sstore_counts(sstore_counts, contract_counts)

if __name__ == "__main__":
    main()
