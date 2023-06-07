// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

library TokenList {
    struct List{
        mapping(uint256 => bool) inArray;
        mapping(uint256 => uint) position;
        uint256[] array;
    }
    
    function safeAddToken(List storage list, uint256 _tokenId) internal {
        if(!list.inArray[_tokenId]){
            list.inArray[_tokenId] = true;
            list.array.push(_tokenId);
            list.position[_tokenId] = list.array.length - 1;
        }
    }
    
    function safeRemoveToken(List storage list, uint256 _tokenId) internal {
        list.inArray[_tokenId] = false;
        if(list.array.length > 1){
            uint lastIndex = list.array.length - 1;
            uint256 lastBook = list.array[lastIndex];
            uint position = list.position[_tokenId];
            list.array[position] = lastBook;
            list.array.pop();
            list.position[lastBook] = position;
        }else{
            list.array.pop();
        }
    }
    
    function getList(List storage list) internal view returns(uint256[] memory) {
        return list.array;
    } 
}