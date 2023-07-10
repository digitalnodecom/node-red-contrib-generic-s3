# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

## 1.10.0 - 2023-07-10
Added optional ContentEncoding hearder for Put Object, Put Objects, Copy Object and Move Object nodes

## 1.9.0 - 2023-05-18
Added Move Object node

## 1.8.0 - 2023-04-28
Added ForcePathStyle option in the config

## 1.7.3 - 2023-04-18
Patched put-object metaData docs typo

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

## 1.7.1 - 2023-02-27
Added stream body property for Put Object node

## 1.7.0 - 2023-02-01
Added Copy Object Node

## 1.6.3 - 2023-01-19
Added Continuation Token property for List Object V2 node

## 1.6.2 - 2023-01-18
Added Stringify Body flag for Get Object node

## 1.6.1 - 2023-01-10
Added Version ID property to Get Object node

## 1.6.0 - 2023-01-09
Added Head Object node

## 1.5.1 - 2023-01-09
Patched README

## 1.5.0 - 2023-01-09
Added List Object Versions node
Updated required fields' indicators
Updated README

## 1.4.0 - 2023-01-09
Added List Objects V2 node

## 1.3.3 - 2023-01-09
Refactored each node into a separate file

## 1.3.2 - 2023-01-07
Updated List Objects node with additional properties such as: MaxKeys, Marker and Prefix
Approprietly updated the documentation

## 1.3.1 - 2023-01-06
Added optional upsert for Put Object
Added optional upsert for Put Objects
Updated nodes' examples

## 1.3.0 - 2023-01-05
Refactored List Bucket node
Refactored List Objects node
Refactored Get Object node
Refactored Create Bucket node
Refactored Put Object node
Refactored Put Objects node
Refactored Delete Object node

### Added
- Changelog
