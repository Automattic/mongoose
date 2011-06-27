#!/bin/bash
if [ $number = `uname -o` = "Cygwin" ]
then    
  echo "Not building native library for cygwin"
else
  echo "Not building native library for cygwin"
  if [ x`which gmake` != "x" ]; then
    echo "Using GNU make";
    gmake total
  else
    make total
  fi
fi