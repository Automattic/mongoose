#!/bin/bash
# find and replace in each markdown file:
# 1. pattern: "(../docs/.*)" becomes "(.*)"
#    example: "(../docs/middleware.html)" becomes "(middleware.html)"
#    example: "(../docs/middleware.html#something)" becomes "(middleware.html#something)"
#    example: "(../docs/typescript/nested.html)" becomes "(typescript/nested.html)"
# 2. pattern: "(../../docs/.*)" becomes "(../.*)"
#    example: "(../../docs/middleware.html)" becomes "(../middleware.html)"
# the parenthesis help guarantee that we are replacing markdown links
# warning: may need to run several times as these sed commands will only match one per line

# get all the documentation markdown files
files=$(find docs -regextype posix-extended -regex '^.*\.md')

for file in $files; 
do
  echo "find and replacing for" $file
  sed -i 's/(\.\.\/docs\/\(.*\))/(\1)/' $file
  sed -i 's/(\.\.\/\.\.\/docs\/\(.*\))/(\1)/' $file
done
