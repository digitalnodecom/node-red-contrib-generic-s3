# Changelog

​
All notable changes to this project will be documented in this file.
​
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
​

## Unreleased

## 1.15.1 - 2024-04-23

## 1.15.0 - 2023-11-10
Added Put Object ACL node

## 1.14.1 - 2023-11-08
Added ACL support for Move Object node

## 1.14.0 - 2023-10-08
Added Get Objects node
Added watch script for development mode
​

## 1.13.0 - 2023-09-03
Added Object Exists node
​

## 1.12.2 - 2023-08-19
​

## 1.12.1 - 2023-08-05
Added warning in README for `structuredClone` undefined exception crashing node-RED
​

## 1.12.0 - 2023-08-03
Async/await refactor v2
​

## 1.11.6 - 2023-08-02
Added msg object clones for better msg object handling
​

## 1.11.5 - 2023-08-01
Updated node.error so it can be catch with catch node
​

## 1.11.4 - 2023-08-01
Reverted the refactor with await/async
​

## 1.11.3 - 2023-08-01
Refactored nodes with await/async
​

## 1.11.2 - 2023-07-24
Added ACL for Copy Object node
​

## 1.11.1 - 2023-07-20
Added ACL for Put Object and Put Objects nodes
​

## 1.11.0 - 2023-07-17
Added Stringify Body with base64 encoding flag for Get Object node (to get binary objects within body)
Restructured get-object.js so `msg.payload.Body` is reusable
​

## 1.10.0 - 2023-07-10
Added optional ContentEncoding hearder for Put Object, Put Objects, Copy Object and Move Object nodes
​

## 1.9.0 - 2023-05-18
Added Move Object node
​

## 1.8.0 - 2023-04-28
Added ForcePathStyle option in the config
​

## 1.7.3 - 2023-04-18
Patched put-object metaData docs typo
​

## 1.7.2 - 2023-04-18
Fixed msg stripping in copy-object
Fixed msg stripping in create-bucket
Fixed msg stripping in delete-object
Fixed msg stripping in get-object
Fixed msg stripping in head-object
Fixed msg stripping in list-buckets
Fixed msg stripping in list-object-versions
Fixed msg stripping in list-objects
Fixed msg stripping in list-objects-v2
Fixed msg stripping in put-object
Fixed msg stripping in put-objects
​

## 1.7.1 - 2023-02-27
Added stream body property for Put Object node
​

## 1.7.0 - 2023-02-01
Added Copy Object Node
​

## 1.6.3 - 2023-01-19
Added Continuation Token property for List Object V2 node
​

## 1.6.2 - 2023-01-18
Added Stringify Body flag for Get Object node
​

## 1.6.1 - 2023-01-10
Added Version ID property to Get Object node
​

## 1.6.0 - 2023-01-09
Added Head Object node
​

## 1.5.1 - 2023-01-09
Patched README
​

## 1.5.0 - 2023-01-09
Added List Object Versions node
Updated required fields' indicators
Updated README
​

## 1.4.0 - 2023-01-09
Added List Objects V2 node
​

## 1.3.3 - 2023-01-09
Refactored each node into a separate file
​

## 1.3.2 - 2023-01-07
Updated List Objects node with additional properties such as: MaxKeys, Marker and Prefix
Approprietly updated the documentation
​

## 1.3.1 - 2023-01-06
Added optional upsert for Put Object
Added optional upsert for Put Objects
Updated nodes' examples
​

## 1.3.0 - 2023-01-05
Refactored List Bucket node
Refactored List Objects node
Refactored Get Object node
Refactored Create Bucket node
Refactored Put Object node
Refactored Put Objects node
Refactored Delete Object node
​

### Added
- Changelog
