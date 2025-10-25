def to_base3(n):
    if n == 0:
        return "0"  # Base case for 0

    is_negative = False
    if n < 0:
        is_negative = True
        n = abs(n)  # Work with the absolute value for conversion

    ternary_digits = []
    while n > 0:
        remainder = n % 3
        ternary_digits.append(str(remainder))
        n //= 3  # Integer division

    # Reverse the list of digits to get the correct order
    ternary_string = "".join(ternary_digits[::-1])

    if is_negative:
        return "-" + ternary_string
    else:
        return ternary_string

nums = []
results = []
for i in range(81):
    nums.append(to_base3(i))
print(nums)

# for number in nums:
#     result = 0
#     for digit in number:
#         result += int(digit)
#     results.append(result)

# count=[0 for i in range(9)]
# for res in results:
#     count[res] += 1

# print(results)

# print(count)

FILENAME = "data/library.js"

with open(FILENAME,'w') as f:
    f.write('const CARD_LIBRARY = [\n')
    for number in nums:
        f.write('{\nname: "filename", \nimage: "filename", \neffect: null,\npush: '+ number +'\n},')
    f.write(']')