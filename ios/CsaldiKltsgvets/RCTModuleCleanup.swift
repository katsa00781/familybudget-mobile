//
//  RCTModuleCleanup.swift
//  CsaldiKltsgvets
//
//  Created to help prevent TurboModuleManager timeout issues
//

import Foundation
import React

@objc public class RCTModuleCleanup: NSObject {
  
  @objc public static func performCleanup() {
    // Perform any necessary cleanup operations
    DispatchQueue.main.async {
      // Clear any cached modules or resources
      NotificationCenter.default.post(name: NSNotification.Name("RCTModuleCleanupRequested"), object: nil)
    }
  }
  
  @objc public static func invalidateModulesWithTimeout(_ timeout: TimeInterval = 5.0) {
    // Create a timeout mechanism for module invalidation
    let workItem = DispatchWorkItem {
      // Perform cleanup operations here
      self.performCleanup()
    }
    
    DispatchQueue.global(qos: .utility).async(execute: workItem)
    
    // Cancel the work item after timeout to prevent hanging
    DispatchQueue.global(qos: .utility).asyncAfter(deadline: .now() + timeout) {
      workItem.cancel()
    }
  }
}