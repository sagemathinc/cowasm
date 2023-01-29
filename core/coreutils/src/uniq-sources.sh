#!/bin/sh

export A=`find . | grep .c$ | xargs -n1 basename | wc -l`

export B=`find . | grep .c$ | xargs -n1 basename |sort | uniq | wc -l`

if [ $A -eq $B ]; then
    echo "good -- $A unique sources files"
else
    echo "ERROR: duplicate sources!"
    exit 1
fi