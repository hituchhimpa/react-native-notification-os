require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "react-native-notification-os"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/HituChhimpa7/react-native-notification-os"
  s.license      = package["license"]
  s.authors      = package["author"]
  s.platforms    = { :ios => "14.0" }
  s.source       = { :git => "https://github.com/HituChhimpa7/react-native-notification-os.git", :tag => "#{s.version}" }

  s.source_files = "ios/Sources/**/*.{h,m,mm,swift}"

  s.frameworks   = "UserNotifications", "UIKit", "Foundation", "CoreData"
  s.weak_frameworks = "ActivityKit"

  # React Native TurboModules & New Architecture compatibility
  if respond_to?(:install_modules_dependencies, true)
    install_modules_dependencies(s)
  else
    s.dependency "React-Core"
  end
end
