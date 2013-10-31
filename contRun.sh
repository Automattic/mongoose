#!/bin/bash

make test

ret=$?

while [ $ret == 0 ]; do
  make test
  ret=$?
done
