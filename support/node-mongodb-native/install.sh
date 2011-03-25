#!/bin/bash
if [ $number = `uname -o` = "Cygwin" ]
then    
  echo "Not building native library for cygwin"
else
  echo "Not building native library for cygwin"
  make total
fi