// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

library TokenList {
    struct List{
        mapping(bytes32 => bool) inArray;
        mapping(bytes32 => uint) position;
        bytes32[] array;
    }
    
    function safeAddToken(List storage list, bytes32 _tokenId) internal {
        if(!list.inArray[_tokenId]){
            list.inArray[_tokenId] = true;
            list.array.push(_tokenId);
            list.position[_tokenId] = list.array.length - 1;
        }
    }
    
    function safeRemoveToken(List storage list, bytes32 _tokenId) internal {
        list.inArray[_tokenId] = false;
        if(list.array.length > 1){
            uint lastIndex = list.array.length - 1;
            bytes32 lastToken = list.array[lastIndex];
            uint position = list.position[_tokenId];
            list.array[position] = lastToken;
            list.array.pop();
            list.position[lastToken] = position;
        }else if(list.array.length == 1){
            list.array.pop();
        }
    }
    
    function getList(List storage list) internal view returns(bytes32[] memory) {
        return list.array;
    } 
}